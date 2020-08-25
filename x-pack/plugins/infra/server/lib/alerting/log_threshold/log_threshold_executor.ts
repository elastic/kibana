/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AlertExecutorOptions, AlertServices } from '../../../../../alerts/server';
import {
  AlertStates,
  Comparator,
  LogDocumentCountAlertParams,
  Criterion,
  GroupedSearchQueryResponseRT,
  UngroupedSearchQueryResponseRT,
  UngroupedSearchQueryResponse,
  GroupedSearchQueryResponse,
  LogDocumentCountAlertParamsRT,
} from '../../../../common/alerting/logs/types';
import { InfraBackendLibs } from '../../infra_types';
import { getIntervalInSeconds } from '../../../utils/get_interval_in_seconds';
import { InfraSource } from '../../../../common/http_api/source_api';
import { decodeOrThrow } from '../../../../common/runtime_types';
import { UNGROUPED_FACTORY_KEY } from '../common/utils';

const COMPOSITE_GROUP_SIZE = 40;

const checkValueAgainstComparatorMap: {
  [key: string]: (a: number, b: number) => boolean;
} = {
  [Comparator.GT]: (a: number, b: number) => a > b,
  [Comparator.GT_OR_EQ]: (a: number, b: number) => a >= b,
  [Comparator.LT]: (a: number, b: number) => a < b,
  [Comparator.LT_OR_EQ]: (a: number, b: number) => a <= b,
};

export const createLogThresholdExecutor = (libs: InfraBackendLibs) =>
  async function ({ services, params }: AlertExecutorOptions) {
    const { alertInstanceFactory, savedObjectsClient, callCluster } = services;
    const { sources } = libs;
    const { groupBy } = params;

    const sourceConfiguration = await sources.getSourceConfiguration(savedObjectsClient, 'default');
    const indexPattern = sourceConfiguration.configuration.logAlias;
    const alertInstance = alertInstanceFactory(UNGROUPED_FACTORY_KEY);

    try {
      const validatedParams = decodeOrThrow(LogDocumentCountAlertParamsRT)(params);

      const query =
        groupBy && groupBy.length > 0
          ? getGroupedESQuery(validatedParams, sourceConfiguration.configuration, indexPattern)
          : getUngroupedESQuery(validatedParams, sourceConfiguration.configuration, indexPattern);

      if (!query) {
        throw new Error('ES query could not be built from the provided alert params');
      }

      if (groupBy && groupBy.length > 0) {
        processGroupByResults(
          await getGroupedResults(query, callCluster),
          validatedParams,
          alertInstanceFactory
        );
      } else {
        processUngroupedResults(
          await getUngroupedResults(query, callCluster),
          validatedParams,
          alertInstanceFactory
        );
      }
    } catch (e) {
      alertInstance.replaceState({
        alertState: AlertStates.ERROR,
      });

      throw new Error(e);
    }
  };

const processUngroupedResults = (
  results: UngroupedSearchQueryResponse,
  params: LogDocumentCountAlertParams,
  alertInstanceFactory: AlertExecutorOptions['services']['alertInstanceFactory']
) => {
  const { count, criteria } = params;

  const alertInstance = alertInstanceFactory(UNGROUPED_FACTORY_KEY);
  const documentCount = results.hits.total.value;

  if (checkValueAgainstComparatorMap[count.comparator](documentCount, count.value)) {
    alertInstance.scheduleActions(FIRED_ACTIONS.id, {
      matchingDocuments: documentCount,
      conditions: createConditionsMessage(criteria),
      group: null,
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

interface ReducedGroupByResults {
  name: string;
  documentCount: number;
}

const processGroupByResults = (
  results: GroupedSearchQueryResponse['aggregations']['groups']['buckets'],
  params: LogDocumentCountAlertParams,
  alertInstanceFactory: AlertExecutorOptions['services']['alertInstanceFactory']
) => {
  const { count, criteria } = params;

  const groupResults = results.reduce<ReducedGroupByResults[]>((acc, groupBucket) => {
    const groupName = Object.values(groupBucket.key).join(', ');
    const groupResult = { name: groupName, documentCount: groupBucket.filtered_results.doc_count };
    return [...acc, groupResult];
  }, []);

  groupResults.forEach((group) => {
    const alertInstance = alertInstanceFactory(group.name);
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

export const buildFiltersFromCriteria = (
  params: Omit<LogDocumentCountAlertParams, 'count'>,
  timestampField: string
) => {
  const { timeSize, timeUnit, criteria } = params;
  const interval = `${timeSize}${timeUnit}`;
  const intervalAsSeconds = getIntervalInSeconds(interval);
  const intervalAsMs = intervalAsSeconds * 1000;
  const to = Date.now();
  const from = to - intervalAsMs;

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

  const rangeFilter = {
    range: {
      [timestampField]: {
        gte: from,
        lte: to,
        format: 'epoch_millis',
      },
    },
  };

  // For group by scenarios we'll pad the time range by 1 x the interval size on the left (lte) and right (gte), this is so
  // a wider net is cast to "capture" the groups. This is to account for scenarios where we want ascertain if
  // there were "no documents" (less than 1 for example). In these cases we may be missing documents to build the groups
  // and match / not match the criteria.
  const groupedRangeFilter = {
    range: {
      [timestampField]: {
        gte: from - intervalAsMs,
        lte: to + intervalAsMs,
        format: 'epoch_millis',
      },
    },
  };

  return { rangeFilter, groupedRangeFilter, mustFilters, mustNotFilters };
};

export const getGroupedESQuery = (
  params: Omit<LogDocumentCountAlertParams, 'count'>,
  sourceConfiguration: InfraSource['configuration'],
  index: string
): object | undefined => {
  const { groupBy } = params;

  if (!groupBy || !groupBy.length) {
    return;
  }

  const timestampField = sourceConfiguration.fields.timestamp;

  const { rangeFilter, groupedRangeFilter, mustFilters, mustNotFilters } = buildFiltersFromCriteria(
    params,
    timestampField
  );

  const aggregations = {
    groups: {
      composite: {
        size: COMPOSITE_GROUP_SIZE,
        sources: groupBy.map((field, groupIndex) => ({
          [`group-${groupIndex}-${field}`]: {
            terms: { field },
          },
        })),
      },
      aggregations: {
        filtered_results: {
          filter: {
            bool: {
              // Scope the inner filtering back to the unpadded range
              filter: [rangeFilter, ...mustFilters],
            },
          },
        },
      },
    },
  };

  const body = {
    query: {
      bool: {
        filter: [groupedRangeFilter],
        ...(mustNotFilters.length > 0 && { must_not: mustNotFilters }),
      },
    },
    aggregations,
    size: 0,
  };

  return {
    index,
    allowNoIndices: true,
    ignoreUnavailable: true,
    body,
  };
};

export const getUngroupedESQuery = (
  params: Omit<LogDocumentCountAlertParams, 'count'>,
  sourceConfiguration: InfraSource['configuration'],
  index: string
): object => {
  const { rangeFilter, mustFilters, mustNotFilters } = buildFiltersFromCriteria(
    params,
    sourceConfiguration.fields.timestamp
  );

  const body = {
    // Ensure we accurately track the hit count for the ungrouped case, otherwise we can only ensure accuracy up to 10,000.
    track_total_hits: true,
    query: {
      bool: {
        filter: [rangeFilter, ...mustFilters],
        ...(mustNotFilters.length > 0 && { must_not: mustNotFilters }),
      },
    },
    size: 0,
  };

  return {
    index,
    allowNoIndices: true,
    ignoreUnavailable: true,
    body,
  };
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

const getUngroupedResults = async (query: object, callCluster: AlertServices['callCluster']) => {
  return decodeOrThrow(UngroupedSearchQueryResponseRT)(await callCluster('search', query));
};

const getGroupedResults = async (query: object, callCluster: AlertServices['callCluster']) => {
  let compositeGroupBuckets: GroupedSearchQueryResponse['aggregations']['groups']['buckets'] = [];
  let lastAfterKey: GroupedSearchQueryResponse['aggregations']['groups']['after_key'] | undefined;

  while (true) {
    const queryWithAfterKey: any = { ...query };
    queryWithAfterKey.body.aggregations.groups.composite.after = lastAfterKey;
    const groupResponse: GroupedSearchQueryResponse = decodeOrThrow(GroupedSearchQueryResponseRT)(
      await callCluster('search', queryWithAfterKey)
    );
    compositeGroupBuckets = [
      ...compositeGroupBuckets,
      ...groupResponse.aggregations.groups.buckets,
    ];
    lastAfterKey = groupResponse.aggregations.groups.after_key;
    if (groupResponse.aggregations.groups.buckets.length < COMPOSITE_GROUP_SIZE) {
      break;
    }
  }

  return compositeGroupBuckets;
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
