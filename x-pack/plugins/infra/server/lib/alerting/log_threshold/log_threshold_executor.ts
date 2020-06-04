/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AlertExecutorOptions, AlertServices } from '../../../../../alerting/server';
import {
  AlertStates,
  Comparator,
  LogDocumentCountAlertParams,
  Criterion,
  Aggregations,
} from '../../../../common/alerting/logs/types';
import { InfraBackendLibs } from '../../infra_types';
import { getIntervalInSeconds } from '../../../utils/get_interval_in_seconds';
import { InfraSource } from '../../../../common/http_api/source_api';
import { createAfterKeyHandler } from '../../../utils/create_afterkey_handler';
import { getAllCompositeData } from '../../../utils/get_all_composite_data';
import { InfraDatabaseSearchResponse } from '../../adapters/framework/adapter_types';

const GROUP_BY_KEY = 'groups';

const UNGROUPED_NAME = i18n.translate(
  'xpack.infra.logs.alerting.threshold.alerting.ungroupedGroupName',
  {
    defaultMessage: 'Ungrouped (*)',
  }
);

const UNGROUPED_FACTORY_KEY = '*';

const checkValueAgainstComparatorMap: {
  [key: string]: (a: number, b: number) => boolean;
} = {
  [Comparator.GT]: (a: number, b: number) => a > b,
  [Comparator.GT_OR_EQ]: (a: number, b: number) => a >= b,
  [Comparator.LT]: (a: number, b: number) => a < b,
  [Comparator.LT_OR_EQ]: (a: number, b: number) => a <= b,
};

export const createLogThresholdExecutor = (alertId: string, libs: InfraBackendLibs) =>
  async function ({ services, params }: AlertExecutorOptions) {
    const { alertInstanceFactory, savedObjectsClient, callCluster } = services;
    const { sources } = libs;
    const castParams = params as LogDocumentCountAlertParams;
    const { groupBy } = castParams;

    const sourceConfiguration = await sources.getSourceConfiguration(savedObjectsClient, 'default');
    const indexPattern = sourceConfiguration.configuration.logAlias;
    const alertInstance = alertInstanceFactory(alertId);

    try {
      const query = getESQuery(castParams, sourceConfiguration.configuration);

      const results = groupBy
        ? await getGroupedResults(query, indexPattern, callCluster, GROUP_BY_KEY)
        : await getUngroupedResults(query, indexPattern, callCluster);

      if (groupBy) {
        processGroupByResults({ results, params: castParams, alertInstanceFactory, alertId });
      } else {
        processUngroupedResults({ results, params: castParams, alertInstanceFactory, alertId });
      }
    } catch (e) {
      alertInstance.replaceState({
        alertState: AlertStates.ERROR,
      });

      throw new Error(e);
    }
  };

interface ProcessingParams<Results> {
  results: Results;
  params: LogDocumentCountAlertParams;
  alertInstanceFactory: AlertExecutorOptions['services']['alertInstanceFactory'];
  alertId: string;
}

interface GroupBucket {
  key: Record<string, string>;
  doc_count: number;
}

interface ReducedGroupBucket {
  name: string;
  documentCount: number;
}

const processUngroupedResults = ({
  results,
  params,
  alertInstanceFactory,
  alertId,
}: ProcessingParams<InfraDatabaseSearchResponse<{}, Aggregations>>) => {
  const { count, criteria } = params;

  const alertInstance = alertInstanceFactory(`${alertId}-${UNGROUPED_FACTORY_KEY}`);
  const documentCount = results.hits.total.value;

  if (checkValueAgainstComparatorMap[count.comparator](documentCount, count.value)) {
    alertInstance.scheduleActions(FIRED_ACTIONS.id, {
      matchingDocuments: documentCount,
      conditions: createConditionsMessage(criteria),
      group: UNGROUPED_NAME,
    });

    alertInstance.replaceState({
      alertState: AlertStates.ALERT,
    });
  } else {
    alertInstance.replaceState({
      alertState: AlertStates.OK,
    });
  }
};

const processGroupByResults = ({
  results,
  params,
  alertInstanceFactory,
  alertId,
}: ProcessingParams<GroupBucket[]>) => {
  const { count, criteria } = params;

  const groupResults: ReducedGroupBucket[] = results.reduce((acc, groupBucket) => {
    const groupName = Object.values(groupBucket.key).join(', ');
    const groupResult = { name: groupName, documentCount: groupBucket.doc_count };
    return [...acc, groupResult];
  }, [] as ReducedGroupBucket[]);

  groupResults.forEach((group) => {
    const alertInstance = alertInstanceFactory(`${alertId}-${group.name}`);
    const documentCount = group.documentCount;

    if (checkValueAgainstComparatorMap[count.comparator](documentCount, count.value)) {
      alertInstance.scheduleActions(FIRED_ACTIONS.id, {
        matchingDocuments: documentCount,
        conditions: createConditionsMessage(criteria),
        group: group.name,
      });

      alertInstance.replaceState({
        alertState: AlertStates.ALERT,
      });
    } else {
      alertInstance.replaceState({
        alertState: AlertStates.OK,
      });
    }
  });
};

const getESQuery = (
  params: LogDocumentCountAlertParams,
  sourceConfiguration: InfraSource['configuration']
): object => {
  const { timeSize, timeUnit, criteria, groupBy } = params;
  const interval = `${timeSize}${timeUnit}`;
  const intervalAsSeconds = getIntervalInSeconds(interval);
  const to = Date.now();
  const from = to - intervalAsSeconds * 1000;

  const positiveComparators = getPositiveComparators();
  const negativeComparators = getNegativeComparators();
  const positiveCriteria = criteria.filter((criterion) =>
    positiveComparators.includes(criterion.comparator)
  );
  const negativeCriteria = criteria.filter((criterion) =>
    negativeComparators.includes(criterion.comparator)
  );
  // Positive assertions (things that "must" match)
  const mustFilters = buildFiltersForCriteria(positiveCriteria);
  // Negative assertions (things that "must not" match)
  const mustNotFilters = buildFiltersForCriteria(negativeCriteria);

  const rangeFilters = [
    {
      range: {
        [sourceConfiguration.fields.timestamp]: {
          gte: from,
          lte: to,
          format: 'epoch_millis',
        },
      },
    },
  ];

  const sharedSubLevelAggregations = {
    interval_buckets: {
      date_histogram: {
        field: sourceConfiguration.fields.timestamp,
        fixed_interval: interval,
      },
    },
  };

  const aggregations =
    groupBy && groupBy.length > 0
      ? {
          groups: {
            composite: {
              size: 20,
              sources: groupBy.map((field, index) => ({
                [`group-${index}-${field}`]: {
                  terms: { field },
                },
              })),
            },
            aggs: sharedSubLevelAggregations,
          },
        }
      : sharedSubLevelAggregations;

  const query = {
    query: {
      bool: {
        filter: [...rangeFilters],
        ...(mustFilters.length > 0 && { must: mustFilters }),
        ...(mustNotFilters.length > 0 && { must_not: mustNotFilters }),
      },
    },
    aggs: aggregations,
    size: 0,
  };

  return query;
};

type SupportedESQueryTypes = 'term' | 'match' | 'match_phrase' | 'range';
type Filter = {
  [key in SupportedESQueryTypes]?: object;
};

const buildFiltersForCriteria = (criteria: LogDocumentCountAlertParams['criteria']) => {
  let filters: Filter[] = [];

  criteria.forEach((criterion) => {
    const criterionQuery = buildCriterionQuery(criterion);
    if (criterionQuery) {
      filters = [...filters, criterionQuery];
    }
  });
  return filters;
};

const buildCriterionQuery = (criterion: Criterion): Filter | undefined => {
  const { field, value, comparator } = criterion;

  const queryType = getQueryMappingForComparator(comparator);

  switch (queryType) {
    case 'term':
      return {
        term: {
          [field]: {
            value,
          },
        },
      };
      break;
    case 'match': {
      return {
        match: {
          [field]: value,
        },
      };
    }
    case 'match_phrase': {
      return {
        match_phrase: {
          [field]: value,
        },
      };
    }
    case 'range': {
      const comparatorToRangePropertyMapping: {
        [key: string]: string;
      } = {
        [Comparator.LT]: 'lt',
        [Comparator.LT_OR_EQ]: 'lte',
        [Comparator.GT]: 'gt',
        [Comparator.GT_OR_EQ]: 'gte',
      };

      const rangeProperty = comparatorToRangePropertyMapping[comparator];

      return {
        range: {
          [field]: {
            [rangeProperty]: value,
          },
        },
      };
    }
    default: {
      return undefined;
    }
  }
};

const getPositiveComparators = () => {
  return [
    Comparator.GT,
    Comparator.GT_OR_EQ,
    Comparator.LT,
    Comparator.LT_OR_EQ,
    Comparator.EQ,
    Comparator.MATCH,
    Comparator.MATCH_PHRASE,
  ];
};

const getNegativeComparators = () => {
  return [Comparator.NOT_EQ, Comparator.NOT_MATCH, Comparator.NOT_MATCH_PHRASE];
};

const queryMappings: {
  [key: string]: string;
} = {
  [Comparator.GT]: 'range',
  [Comparator.GT_OR_EQ]: 'range',
  [Comparator.LT]: 'range',
  [Comparator.LT_OR_EQ]: 'range',
  [Comparator.EQ]: 'term',
  [Comparator.MATCH]: 'match',
  [Comparator.MATCH_PHRASE]: 'match_phrase',
  [Comparator.NOT_EQ]: 'term',
  [Comparator.NOT_MATCH]: 'match',
  [Comparator.NOT_MATCH_PHRASE]: 'match_phrase',
};

const getQueryMappingForComparator = (comparator: Comparator) => {
  return queryMappings[comparator];
};

const getUngroupedResults = async (
  query: object,
  index: string,
  callCluster: AlertServices['callCluster']
) => {
  return await callCluster('search', {
    body: query,
    index,
  });
};

const getGroupedResults = async (
  query: object,
  index: string,
  callCluster: AlertServices['callCluster'],
  groupingsKey: string
) => {
  const bucketSelector = (response: InfraDatabaseSearchResponse<{}, Aggregations>) => {
    const aggs = response.aggregations;
    return aggs ? aggs[groupingsKey]?.buckets : [];
  };

  const afterKeyHandler = createAfterKeyHandler(
    `aggs.${groupingsKey}.composite.after`,
    (response) => {
      const aggs = response.aggregations;
      return aggs[groupingsKey]?.after_key;
    }
  );

  const compositeBuckets = (await getAllCompositeData(
    (body) => callCluster('search', { body: query, index }),
    query,
    bucketSelector,
    afterKeyHandler
  )) as Aggregations[];

  return compositeBuckets;
};

const createConditionsMessage = (criteria: LogDocumentCountAlertParams['criteria']) => {
  const parts = criteria.map((criterion, index) => {
    const { field, comparator, value } = criterion;
    return `${index === 0 ? '' : 'and'} ${field} ${comparator} ${value}`;
  });
  return parts.join(' ');
};

// When the Alerting plugin implements support for multiple action groups, add additional
// action groups here to send different messages, e.g. a recovery notification
export const FIRED_ACTIONS = {
  id: 'logs.threshold.fired',
  name: i18n.translate('xpack.infra.logs.alerting.threshold.fired', {
    defaultMessage: 'Fired',
  }),
};
