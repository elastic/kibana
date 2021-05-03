/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ElasticsearchClient } from 'kibana/server';
import { estypes } from '@elastic/elasticsearch';
import {
  AlertExecutorOptions,
  AlertServices,
  AlertInstance,
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceContext,
  AlertInstanceState,
  ActionGroup,
  ActionGroupIdsOf,
} from '../../../../../alerting/server';
import {
  AlertStates,
  Comparator,
  AlertParams,
  Criterion,
  GroupedSearchQueryResponseRT,
  UngroupedSearchQueryResponseRT,
  UngroupedSearchQueryResponse,
  GroupedSearchQueryResponse,
  alertParamsRT,
  isRatioAlertParams,
  hasGroupBy,
  getNumerator,
  getDenominator,
  CountCriteria,
  CountAlertParams,
  RatioAlertParams,
} from '../../../../common/alerting/logs/log_threshold/types';
import { InfraBackendLibs } from '../../infra_types';
import { getIntervalInSeconds } from '../../../utils/get_interval_in_seconds';
import { decodeOrThrow } from '../../../../common/runtime_types';
import { UNGROUPED_FACTORY_KEY } from '../common/utils';
import { resolveLogSourceConfiguration } from '../../../../common/log_sources';

type LogThresholdActionGroups = ActionGroupIdsOf<typeof FIRED_ACTIONS>;
type LogThresholdAlertServices = AlertServices<
  AlertInstanceState,
  AlertInstanceContext,
  LogThresholdActionGroups
>;
type LogThresholdAlertExecutorOptions = AlertExecutorOptions<
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  LogThresholdActionGroups
>;

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
  async function ({ services, params }: LogThresholdAlertExecutorOptions) {
    const { alertInstanceFactory, savedObjectsClient, scopedClusterClient } = services;
    const { sources } = libs;

    const sourceConfiguration = await sources.getSourceConfiguration(savedObjectsClient, 'default');
    const { indices, timestampField, runtimeMappings } = await resolveLogSourceConfiguration(
      sourceConfiguration.configuration,
      await libs.framework.getIndexPatternsService(
        savedObjectsClient,
        scopedClusterClient.asCurrentUser
      )
    );

    try {
      const validatedParams = decodeOrThrow(alertParamsRT)(params);

      if (!isRatioAlertParams(validatedParams)) {
        await executeAlert(
          validatedParams,
          timestampField,
          indices,
          runtimeMappings,
          scopedClusterClient.asCurrentUser,
          alertInstanceFactory
        );
      } else {
        await executeRatioAlert(
          validatedParams,
          timestampField,
          indices,
          runtimeMappings,
          scopedClusterClient.asCurrentUser,
          alertInstanceFactory
        );
      }
    } catch (e) {
      throw new Error(e);
    }
  };

async function executeAlert(
  alertParams: CountAlertParams,
  timestampField: string,
  indexPattern: string,
  runtimeMappings: estypes.RuntimeFields,
  esClient: ElasticsearchClient,
  alertInstanceFactory: LogThresholdAlertServices['alertInstanceFactory']
) {
  const query = getESQuery(alertParams, timestampField, indexPattern, runtimeMappings);

  if (!query) {
    throw new Error('ES query could not be built from the provided alert params');
  }

  if (hasGroupBy(alertParams)) {
    processGroupByResults(
      await getGroupedResults(query, esClient),
      alertParams,
      alertInstanceFactory,
      updateAlertInstance
    );
  } else {
    processUngroupedResults(
      await getUngroupedResults(query, esClient),
      alertParams,
      alertInstanceFactory,
      updateAlertInstance
    );
  }
}

async function executeRatioAlert(
  alertParams: RatioAlertParams,
  timestampField: string,
  indexPattern: string,
  runtimeMappings: estypes.RuntimeFields,
  esClient: ElasticsearchClient,
  alertInstanceFactory: LogThresholdAlertServices['alertInstanceFactory']
) {
  // Ratio alert params are separated out into two standard sets of alert params
  const numeratorParams: AlertParams = {
    ...alertParams,
    criteria: getNumerator(alertParams.criteria),
  };

  const denominatorParams: AlertParams = {
    ...alertParams,
    criteria: getDenominator(alertParams.criteria),
  };

  const numeratorQuery = getESQuery(numeratorParams, timestampField, indexPattern, runtimeMappings);
  const denominatorQuery = getESQuery(
    denominatorParams,
    timestampField,
    indexPattern,
    runtimeMappings
  );

  if (!numeratorQuery || !denominatorQuery) {
    throw new Error('ES query could not be built from the provided ratio alert params');
  }

  if (hasGroupBy(alertParams)) {
    const numeratorGroupedResults = await getGroupedResults(numeratorQuery, esClient);
    const denominatorGroupedResults = await getGroupedResults(denominatorQuery, esClient);
    processGroupByRatioResults(
      numeratorGroupedResults,
      denominatorGroupedResults,
      alertParams,
      alertInstanceFactory,
      updateAlertInstance
    );
  } else {
    const numeratorUngroupedResults = await getUngroupedResults(numeratorQuery, esClient);
    const denominatorUngroupedResults = await getUngroupedResults(denominatorQuery, esClient);
    processUngroupedRatioResults(
      numeratorUngroupedResults,
      denominatorUngroupedResults,
      alertParams,
      alertInstanceFactory,
      updateAlertInstance
    );
  }
}

const getESQuery = (
  alertParams: Omit<AlertParams, 'criteria'> & { criteria: CountCriteria },
  timestampField: string,
  indexPattern: string,
  runtimeMappings: estypes.RuntimeFields
) => {
  return hasGroupBy(alertParams)
    ? getGroupedESQuery(alertParams, timestampField, indexPattern, runtimeMappings)
    : getUngroupedESQuery(alertParams, timestampField, indexPattern, runtimeMappings);
};

export const processUngroupedResults = (
  results: UngroupedSearchQueryResponse,
  params: CountAlertParams,
  alertInstanceFactory: LogThresholdAlertExecutorOptions['services']['alertInstanceFactory'],
  alertInstaceUpdater: AlertInstanceUpdater
) => {
  const { count, criteria } = params;
  const documentCount = results.hits.total.value;

  if (checkValueAgainstComparatorMap[count.comparator](documentCount, count.value)) {
    const alertInstance = alertInstanceFactory(UNGROUPED_FACTORY_KEY);
    alertInstaceUpdater(alertInstance, AlertStates.ALERT, [
      {
        actionGroup: FIRED_ACTIONS.id,
        context: {
          matchingDocuments: documentCount,
          conditions: createConditionsMessageForCriteria(criteria),
          group: null,
          isRatio: false,
        },
      },
    ]);
  }
};

export const processUngroupedRatioResults = (
  numeratorResults: UngroupedSearchQueryResponse,
  denominatorResults: UngroupedSearchQueryResponse,
  params: RatioAlertParams,
  alertInstanceFactory: LogThresholdAlertExecutorOptions['services']['alertInstanceFactory'],
  alertInstaceUpdater: AlertInstanceUpdater
) => {
  const { count, criteria } = params;

  const numeratorCount = numeratorResults.hits.total.value;
  const denominatorCount = denominatorResults.hits.total.value;
  const ratio = getRatio(numeratorCount, denominatorCount);

  if (ratio !== undefined && checkValueAgainstComparatorMap[count.comparator](ratio, count.value)) {
    const alertInstance = alertInstanceFactory(UNGROUPED_FACTORY_KEY);
    alertInstaceUpdater(alertInstance, AlertStates.ALERT, [
      {
        actionGroup: FIRED_ACTIONS.id,
        context: {
          ratio,
          numeratorConditions: createConditionsMessageForCriteria(getNumerator(criteria)),
          denominatorConditions: createConditionsMessageForCriteria(getDenominator(criteria)),
          group: null,
          isRatio: true,
        },
      },
    ]);
  }
};

const getRatio = (numerator: number, denominator: number) => {
  // We follow the mathematics principle that dividing by 0 isn't possible,
  // and a ratio is therefore undefined (or indeterminate).
  if (numerator === 0 || denominator === 0) return undefined;
  return numerator / denominator;
};

interface ReducedGroupByResult {
  name: string;
  documentCount: number;
}

type ReducedGroupByResults = ReducedGroupByResult[];

const getReducedGroupByResults = (
  results: GroupedSearchQueryResponse['aggregations']['groups']['buckets']
): ReducedGroupByResults => {
  return results.reduce<ReducedGroupByResults>((acc, groupBucket) => {
    const groupName = Object.values(groupBucket.key).join(', ');
    const groupResult = { name: groupName, documentCount: groupBucket.filtered_results.doc_count };
    return [...acc, groupResult];
  }, []);
};

export const processGroupByResults = (
  results: GroupedSearchQueryResponse['aggregations']['groups']['buckets'],
  params: CountAlertParams,
  alertInstanceFactory: LogThresholdAlertExecutorOptions['services']['alertInstanceFactory'],
  alertInstaceUpdater: AlertInstanceUpdater
) => {
  const { count, criteria } = params;

  const groupResults = getReducedGroupByResults(results);

  groupResults.forEach((group) => {
    const documentCount = group.documentCount;

    if (checkValueAgainstComparatorMap[count.comparator](documentCount, count.value)) {
      const alertInstance = alertInstanceFactory(group.name);
      alertInstaceUpdater(alertInstance, AlertStates.ALERT, [
        {
          actionGroup: FIRED_ACTIONS.id,
          context: {
            matchingDocuments: documentCount,
            conditions: createConditionsMessageForCriteria(criteria),
            group: group.name,
            isRatio: false,
          },
        },
      ]);
    }
  });
};

export const processGroupByRatioResults = (
  numeratorResults: GroupedSearchQueryResponse['aggregations']['groups']['buckets'],
  denominatorResults: GroupedSearchQueryResponse['aggregations']['groups']['buckets'],
  params: RatioAlertParams,
  alertInstanceFactory: LogThresholdAlertExecutorOptions['services']['alertInstanceFactory'],
  alertInstaceUpdater: AlertInstanceUpdater
) => {
  const { count, criteria } = params;

  const numeratorGroupResults = getReducedGroupByResults(numeratorResults);
  const denominatorGroupResults = getReducedGroupByResults(denominatorResults);

  numeratorGroupResults.forEach((numeratorGroup) => {
    const numeratorDocumentCount = numeratorGroup.documentCount;
    const denominatorGroup = denominatorGroupResults.find(
      (_group) => _group.name === numeratorGroup.name
    );
    // If there is no matching group, a ratio cannot be determined, and is therefore undefined.
    const ratio = denominatorGroup
      ? getRatio(numeratorDocumentCount, denominatorGroup.documentCount)
      : undefined;
    if (
      ratio !== undefined &&
      checkValueAgainstComparatorMap[count.comparator](ratio, count.value)
    ) {
      const alertInstance = alertInstanceFactory(numeratorGroup.name);
      alertInstaceUpdater(alertInstance, AlertStates.ALERT, [
        {
          actionGroup: FIRED_ACTIONS.id,
          context: {
            ratio,
            numeratorConditions: createConditionsMessageForCriteria(getNumerator(criteria)),
            denominatorConditions: createConditionsMessageForCriteria(getDenominator(criteria)),
            group: numeratorGroup.name,
            isRatio: true,
          },
        },
      ]);
    }
  });
};

type AlertInstanceUpdater = (
  alertInstance: AlertInstance<AlertInstanceState, AlertInstanceContext, LogThresholdActionGroups>,
  state: AlertStates,
  actions?: Array<{ actionGroup: LogThresholdActionGroups; context: AlertInstanceContext }>
) => void;

export const updateAlertInstance: AlertInstanceUpdater = (alertInstance, state, actions) => {
  if (actions && actions.length > 0) {
    const sharedContext = {
      timestamp: new Date().toISOString(),
    };
    actions.forEach((actionSet) => {
      const { actionGroup, context } = actionSet;
      alertInstance.scheduleActions(actionGroup, { ...sharedContext, ...context });
    });
  }

  alertInstance.replaceState({
    alertState: state,
  });
};

export const buildFiltersFromCriteria = (
  params: Pick<AlertParams, 'timeSize' | 'timeUnit'> & { criteria: CountCriteria },
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
  params: Pick<AlertParams, 'timeSize' | 'timeUnit' | 'groupBy'> & { criteria: CountCriteria },
  timestampField: string,
  index: string,
  runtimeMappings: estypes.RuntimeFields
): estypes.SearchRequest | undefined => {
  const { groupBy } = params;

  if (!groupBy || !groupBy.length) {
    return;
  }

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
              ...(mustNotFilters.length > 0 && { must_not: mustNotFilters }),
            },
          },
        },
      },
    },
  };

  const body: estypes.SearchRequest['body'] = {
    query: {
      bool: {
        filter: [groupedRangeFilter],
      },
    },
    aggregations,
    runtime_mappings: runtimeMappings,
    size: 0,
  };

  return {
    index,
    allow_no_indices: true,
    ignore_unavailable: true,
    body,
  };
};

export const getUngroupedESQuery = (
  params: Pick<AlertParams, 'timeSize' | 'timeUnit'> & { criteria: CountCriteria },
  timestampField: string,
  index: string,
  runtimeMappings: estypes.RuntimeFields
): object => {
  const { rangeFilter, mustFilters, mustNotFilters } = buildFiltersFromCriteria(
    params,
    timestampField
  );

  const body: estypes.SearchRequest['body'] = {
    // Ensure we accurately track the hit count for the ungrouped case, otherwise we can only ensure accuracy up to 10,000.
    track_total_hits: true,
    query: {
      bool: {
        filter: [rangeFilter, ...mustFilters],
        ...(mustNotFilters.length > 0 && { must_not: mustNotFilters }),
      },
    },
    runtime_mappings: runtimeMappings,
    size: 0,
  };

  return {
    index,
    allow_no_indices: true,
    ignore_unavailable: true,
    body,
  };
};

type SupportedESQueryTypes = 'term' | 'match' | 'match_phrase' | 'range';
type Filter = {
  [key in SupportedESQueryTypes]?: object;
};

const buildFiltersForCriteria = (criteria: CountCriteria) => {
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

export const getPositiveComparators = () => {
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

export const getNegativeComparators = () => {
  return [Comparator.NOT_EQ, Comparator.NOT_MATCH, Comparator.NOT_MATCH_PHRASE];
};

export const queryMappings: {
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

const getUngroupedResults = async (query: object, esClient: ElasticsearchClient) => {
  return decodeOrThrow(UngroupedSearchQueryResponseRT)((await esClient.search(query)).body);
};

const getGroupedResults = async (query: object, esClient: ElasticsearchClient) => {
  let compositeGroupBuckets: GroupedSearchQueryResponse['aggregations']['groups']['buckets'] = [];
  let lastAfterKey: GroupedSearchQueryResponse['aggregations']['groups']['after_key'] | undefined;

  while (true) {
    const queryWithAfterKey: any = { ...query };
    queryWithAfterKey.body.aggregations.groups.composite.after = lastAfterKey;
    const groupResponse: GroupedSearchQueryResponse = decodeOrThrow(GroupedSearchQueryResponseRT)(
      (await esClient.search(queryWithAfterKey)).body
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

const createConditionsMessageForCriteria = (criteria: CountCriteria) => {
  const parts = criteria.map((criterion, index) => {
    const { field, comparator, value } = criterion;
    return `${index === 0 ? '' : 'and'} ${field} ${comparator} ${value}`;
  });
  return parts.join(' ');
};

// When the Alerting plugin implements support for multiple action groups, add additional
// action groups here to send different messages, e.g. a recovery notification
export const LogsThresholdFiredActionGroupId = 'logs.threshold.fired';
export const FIRED_ACTIONS: ActionGroup<'logs.threshold.fired'> = {
  id: LogsThresholdFiredActionGroupId,
  name: i18n.translate('xpack.infra.logs.alerting.threshold.fired', {
    defaultMessage: 'Fired',
  }),
};
