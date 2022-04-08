/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createHash } from 'crypto';
import { chunk, get, invert, isEmpty, partition } from 'lodash';
import moment from 'moment';
import uuidv5 from 'uuid/v5';

import dateMath from '@kbn/datemath';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TransportResult } from '@elastic/elasticsearch';
import { ALERT_UUID, ALERT_RULE_UUID, ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import type {
  ListArray,
  ExceptionListItemSchema,
  FoundExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { hasLargeValueList } from '@kbn/securitysolution-list-utils';

import {
  TimestampOverrideOrUndefined,
  Privilege,
  RuleExecutionStatus,
} from '../../../../common/detection_engine/schemas/common';
import type {
  ElasticsearchClient,
  IUiSettingsClient,
  Logger,
  SavedObjectsClientContract,
} from '../../../../../../../src/core/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
  parseDuration,
} from '../../../../../alerting/server';
import type { ExceptionListClient, ListClient, ListPluginSetup } from '../../../../../lists/server';
import type {
  BulkResponseErrorAggregation,
  SignalHit,
  SearchAfterAndBulkCreateReturnType,
  SignalSearchResponse,
  Signal,
  WrappedSignalHit,
  RuleRangeTuple,
  BaseSignalHit,
  SignalSourceHit,
  SimpleHit,
  WrappedEventHit,
} from './types';
import type { BuildRuleMessage } from './rule_messages';
import type { ShardError } from '../../types';
import type {
  EqlRuleParams,
  MachineLearningRuleParams,
  QueryRuleParams,
  RuleParams,
  SavedQueryRuleParams,
  ThreatRuleParams,
  ThresholdRuleParams,
} from '../schemas/rule_schemas';
import type { BaseHit, SearchTypes } from '../../../../common/detection_engine/types';
import type { IRuleExecutionLogForExecutors } from '../rule_execution_log';
import { withSecuritySpan } from '../../../utils/with_security_span';
import { DetectionAlert } from '../../../../common/detection_engine/schemas/alerts';
import { ENABLE_CCS_READ_WARNING_SETTING } from '../../../../common/constants';

interface SortExceptionsReturn {
  exceptionsWithValueLists: ExceptionListItemSchema[];
  exceptionsWithoutValueLists: ExceptionListItemSchema[];
}

export const MAX_RULE_GAP_RATIO = 4;

export const shorthandMap = {
  s: {
    momentString: 'seconds',
    asFn: (duration: moment.Duration) => duration.asSeconds(),
  },
  m: {
    momentString: 'minutes',
    asFn: (duration: moment.Duration) => duration.asMinutes(),
  },
  h: {
    momentString: 'hours',
    asFn: (duration: moment.Duration) => duration.asHours(),
  },
};

export const hasReadIndexPrivileges = async (args: {
  privileges: Privilege;
  logger: Logger;
  buildRuleMessage: BuildRuleMessage;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  uiSettingsClient: IUiSettingsClient;
}): Promise<boolean> => {
  const { privileges, logger, buildRuleMessage, ruleExecutionLogger, uiSettingsClient } = args;

  const isCcsPermissionWarningEnabled = await uiSettingsClient.get(ENABLE_CCS_READ_WARNING_SETTING);

  const indexNames = Object.keys(privileges.index);
  const filteredIndexNames = isCcsPermissionWarningEnabled
    ? indexNames
    : indexNames.filter((indexName) => !indexName.includes(':')); // Cross cluster indices uniquely contain `:` in their name

  const [, indexesWithNoReadPrivileges] = partition(
    filteredIndexNames,
    (indexName) => privileges.index[indexName].read
  );

  if (indexesWithNoReadPrivileges.length > 0) {
    // some indices have read privileges others do not.
    // set a warning status
    const errorString = `This rule may not have the required read privileges to the following indices/index patterns: ${JSON.stringify(
      indexesWithNoReadPrivileges
    )}`;
    logger.warn(buildRuleMessage(errorString));
    await ruleExecutionLogger.logStatusChange({
      newStatus: RuleExecutionStatus['partial failure'],
      message: errorString,
    });
    return true;
  }
  return false;
};

export const hasTimestampFields = async (args: {
  timestampField: string;
  // any is derived from here
  // node_modules/@elastic/elasticsearch/lib/api/kibana.d.ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timestampFieldCapsResponse: TransportResult<Record<string, any>, unknown>;
  inputIndices: string[];
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  logger: Logger;
  buildRuleMessage: BuildRuleMessage;
}): Promise<boolean> => {
  const {
    timestampField,
    timestampFieldCapsResponse,
    inputIndices,
    ruleExecutionLogger,
    logger,
    buildRuleMessage,
  } = args;

  const { ruleName } = ruleExecutionLogger.context;

  if (isEmpty(timestampFieldCapsResponse.body.indices)) {
    const errorString = `This rule is attempting to query data from Elasticsearch indices listed in the "Index pattern" section of the rule definition, however no index matching: ${JSON.stringify(
      inputIndices
    )} was found. This warning will continue to appear until a matching index is created or this rule is disabled. ${
      ruleName === 'Endpoint Security'
        ? 'If you have recently enrolled agents enabled with Endpoint Security through Fleet, this warning should stop once an alert is sent from an agent.'
        : ''
    }`;
    logger.warn(buildRuleMessage(errorString.trimEnd()));
    await ruleExecutionLogger.logStatusChange({
      newStatus: RuleExecutionStatus['partial failure'],
      message: errorString.trimEnd(),
    });
    return true;
  } else if (
    isEmpty(timestampFieldCapsResponse.body.fields) ||
    timestampFieldCapsResponse.body.fields[timestampField] == null ||
    timestampFieldCapsResponse.body.fields[timestampField]?.unmapped?.indices != null
  ) {
    // if there is a timestamp override and the unmapped array for the timestamp override key is not empty,
    // warning
    const errorString = `The following indices are missing the ${
      timestampField === '@timestamp'
        ? 'timestamp field "@timestamp"'
        : `timestamp override field "${timestampField}"`
    }: ${JSON.stringify(
      isEmpty(timestampFieldCapsResponse.body.fields) ||
        isEmpty(timestampFieldCapsResponse.body.fields[timestampField])
        ? timestampFieldCapsResponse.body.indices
        : timestampFieldCapsResponse.body.fields[timestampField]?.unmapped?.indices
    )}`;

    logger.warn(buildRuleMessage(errorString));
    await ruleExecutionLogger.logStatusChange({
      newStatus: RuleExecutionStatus['partial failure'],
      message: errorString,
    });

    return true;
  }
  return false;
};

export const checkPrivileges = async (
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>,
  indices: string[]
): Promise<Privilege> =>
  checkPrivilegesFromEsClient(services.scopedClusterClient.asCurrentUser, indices);

export const checkPrivilegesFromEsClient = async (
  esClient: ElasticsearchClient,
  indices: string[]
): Promise<Privilege> =>
  withSecuritySpan(
    'checkPrivilegesFromEsClient',
    async () =>
      (await esClient.transport.request({
        path: '/_security/user/_has_privileges',
        method: 'POST',
        body: {
          index: [
            {
              names: indices ?? [],
              allow_restricted_indices: true,
              privileges: ['read'],
            },
          ],
        },
      })) as Privilege
  );

export const getNumCatchupIntervals = ({
  gap,
  intervalDuration,
}: {
  gap: moment.Duration;
  intervalDuration: moment.Duration;
}): number => {
  if (gap.asMilliseconds() <= 0 || intervalDuration.asMilliseconds() <= 0) {
    return 0;
  }
  const ratio = Math.ceil(gap.asMilliseconds() / intervalDuration.asMilliseconds());
  // maxCatchup is to ensure we are not trying to catch up too far back.
  // This allows for a maximum of 4 consecutive rule execution misses
  // to be included in the number of signals generated.
  return ratio < MAX_RULE_GAP_RATIO ? ratio : MAX_RULE_GAP_RATIO;
};

export const getListsClient = ({
  lists,
  spaceId,
  updatedByUser,
  services,
  savedObjectClient,
}: {
  lists: ListPluginSetup | undefined;
  spaceId: string;
  updatedByUser: string | null;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  savedObjectClient: SavedObjectsClientContract;
}): {
  listClient: ListClient;
  exceptionsClient: ExceptionListClient;
} => {
  if (lists == null) {
    throw new Error('lists plugin unavailable during rule execution');
  }

  const listClient = lists.getListClient(
    services.scopedClusterClient.asCurrentUser,
    spaceId,
    updatedByUser ?? 'elastic'
  );
  const exceptionsClient = lists.getExceptionListClient(
    savedObjectClient,
    updatedByUser ?? 'elastic'
  );

  return { listClient, exceptionsClient };
};

export const getExceptions = async ({
  client,
  lists,
}: {
  client: ExceptionListClient;
  lists: ListArray;
}): Promise<ExceptionListItemSchema[]> => {
  if (lists.length > 0) {
    try {
      const listIds = lists.map(({ list_id: listId }) => listId);
      const namespaceTypes = lists.map(({ namespace_type: namespaceType }) => namespaceType);

      // Stream the results from the Point In Time (PIT) finder into this array
      let items: ExceptionListItemSchema[] = [];
      const executeFunctionOnStream = (response: FoundExceptionListItemSchema): void => {
        items = [...items, ...response.data];
      };

      await client.findExceptionListsItemPointInTimeFinder({
        executeFunctionOnStream,
        listId: listIds,
        namespaceType: namespaceTypes,
        perPage: 1_000, // See https://github.com/elastic/kibana/issues/93770 for choice of 1k
        filter: [],
        maxSize: undefined, // NOTE: This is unbounded when it is "undefined"
        sortOrder: undefined,
        sortField: undefined,
      });
      return items;
    } catch (e) {
      throw new Error(
        `unable to fetch exception list items, message: "${e.message}" full error: "${e}"`
      );
    }
  } else {
    return [];
  }
};

export const sortExceptionItems = (exceptions: ExceptionListItemSchema[]): SortExceptionsReturn => {
  return exceptions.reduce<SortExceptionsReturn>(
    (acc, exception) => {
      const { entries } = exception;
      const { exceptionsWithValueLists, exceptionsWithoutValueLists } = acc;

      if (hasLargeValueList(entries)) {
        return {
          exceptionsWithValueLists: [...exceptionsWithValueLists, { ...exception }],
          exceptionsWithoutValueLists,
        };
      } else {
        return {
          exceptionsWithValueLists,
          exceptionsWithoutValueLists: [...exceptionsWithoutValueLists, { ...exception }],
        };
      }
    },
    { exceptionsWithValueLists: [], exceptionsWithoutValueLists: [] }
  );
};

export const generateId = (
  docIndex: string,
  docId: string,
  version: string,
  ruleId: string
): string => createHash('sha256').update(docIndex.concat(docId, version, ruleId)).digest('hex');

// TODO: do we need to include version in the id? If it does matter then we should include it in signal.parents as well
export const generateSignalId = (signal: Signal) =>
  createHash('sha256')
    .update(
      signal.parents
        .reduce((acc, parent) => acc.concat(parent.id, parent.index), '')
        .concat(signal.rule.id)
    )
    .digest('hex');

/**
 * Generates unique doc ids for each building block signal within a sequence. The id of each building block
 * depends on the parents of every building block, so that a signal which appears in multiple different sequences
 * (e.g. if multiple rules build sequences that share a common event/signal) will get a unique id per sequence.
 * @param buildingBlocks The full list of building blocks in the sequence.
 */
export const generateBuildingBlockIds = (buildingBlocks: SignalHit[]): string[] => {
  const baseHashString = buildingBlocks.reduce(
    (baseString, block) =>
      baseString
        .concat(
          block.signal.parents.reduce((acc, parent) => acc.concat(parent.id, parent.index), '')
        )
        .concat(block.signal.rule.id),
    ''
  );
  return buildingBlocks.map((block, idx) =>
    createHash('sha256').update(baseHashString).update(String(idx)).digest('hex')
  );
};

export const wrapBuildingBlocks = (
  buildingBlocks: SignalHit[],
  index: string
): WrappedSignalHit[] => {
  const blockIds = generateBuildingBlockIds(buildingBlocks);
  return buildingBlocks.map((block, idx) => {
    return {
      _id: blockIds[idx],
      _index: index,
      _source: {
        ...block,
      },
    };
  });
};

export const wrapSignal = (signal: SignalHit, index: string): WrappedSignalHit => {
  return {
    _id: generateSignalId(signal.signal),
    _index: index,
    _source: signal,
  };
};

export const parseInterval = (intervalString: string): moment.Duration | null => {
  try {
    return moment.duration(parseDuration(intervalString));
  } catch (err) {
    return null;
  }
};

export const getGapBetweenRuns = ({
  previousStartedAt,
  originalFrom,
  originalTo,
  startedAt,
}: {
  previousStartedAt: Date | undefined | null;
  originalFrom: moment.Moment;
  originalTo: moment.Moment;
  startedAt: Date;
}): moment.Duration => {
  if (previousStartedAt == null) {
    return moment.duration(0);
  }
  const driftTolerance = moment.duration(originalTo.diff(originalFrom));
  const currentDuration = moment.duration(moment(startedAt).diff(previousStartedAt));
  return currentDuration.subtract(driftTolerance);
};

export const makeFloatString = (num: number): string => Number(num).toFixed(2);

/**
 * Given a BulkResponse this will return an aggregation based on the errors if any exist
 * from the BulkResponse. Errors are aggregated on the reason as the unique key.
 *
 * Example would be:
 * {
 *   'Parse Error': {
 *      count: 100,
 *      statusCode: 400,
 *   },
 *   'Internal server error': {
 *       count: 3,
 *       statusCode: 500,
 *   }
 * }
 * If this does not return any errors then you will get an empty object like so: {}
 * @param response The bulk response to aggregate based on the error message
 * @param ignoreStatusCodes Optional array of status codes to ignore when creating aggregate error messages
 * @returns The aggregated example as shown above.
 */
export const errorAggregator = (
  response: estypes.BulkResponse,
  ignoreStatusCodes: number[]
): BulkResponseErrorAggregation => {
  return response.items.reduce<BulkResponseErrorAggregation>((accum, item) => {
    if (item.create?.error != null && !ignoreStatusCodes.includes(item.create.status)) {
      if (accum[item.create.error.reason] == null) {
        accum[item.create.error.reason] = {
          count: 1,
          statusCode: item.create.status,
        };
      } else {
        accum[item.create.error.reason] = {
          count: accum[item.create.error.reason].count + 1,
          statusCode: item.create.status,
        };
      }
    }
    return accum;
  }, Object.create(null));
};

export const getRuleRangeTuples = ({
  logger,
  previousStartedAt,
  from,
  to,
  interval,
  maxSignals,
  buildRuleMessage,
  startedAt,
}: {
  logger: Logger;
  previousStartedAt: Date | null | undefined;
  from: string;
  to: string;
  interval: string;
  maxSignals: number;
  buildRuleMessage: BuildRuleMessage;
  startedAt: Date;
}) => {
  const originalTo = dateMath.parse(to, { forceNow: startedAt });
  const originalFrom = dateMath.parse(from, { forceNow: startedAt });
  if (originalTo == null || originalFrom == null) {
    throw new Error(buildRuleMessage('dateMath parse failed'));
  }
  const tuples = [
    {
      to: originalTo,
      from: originalFrom,
      maxSignals,
    },
  ];
  const intervalDuration = parseInterval(interval);
  if (intervalDuration == null) {
    logger.error(`Failed to compute gap between rule runs: could not parse rule interval`);
    return { tuples, remainingGap: moment.duration(0) };
  }
  const gap = getGapBetweenRuns({
    previousStartedAt,
    originalTo,
    originalFrom,
    startedAt,
  });
  const catchup = getNumCatchupIntervals({
    gap,
    intervalDuration,
  });
  const catchupTuples = getCatchupTuples({
    originalTo,
    originalFrom,
    ruleParamsMaxSignals: maxSignals,
    catchup,
    intervalDuration,
  });
  tuples.push(...catchupTuples);
  // Each extra tuple adds one extra intervalDuration to the time range this rule will cover.
  const remainingGapMilliseconds = Math.max(
    gap.asMilliseconds() - catchup * intervalDuration.asMilliseconds(),
    0
  );
  return { tuples: tuples.reverse(), remainingGap: moment.duration(remainingGapMilliseconds) };
};

/**
 * Creates rule range tuples needed to cover gaps since the last rule run.
 * @param to moment.Moment representing the rules 'to' property
 * @param from moment.Moment representing the rules 'from' property
 * @param ruleParamsMaxSignals int representing the maxSignals property on the rule (usually unmodified at 100)
 * @param catchup number the number of additional rule run intervals to add
 * @param intervalDuration moment.Duration the interval which the rule runs
 */
export const getCatchupTuples = ({
  originalTo,
  originalFrom,
  ruleParamsMaxSignals,
  catchup,
  intervalDuration,
}: {
  originalTo: moment.Moment;
  originalFrom: moment.Moment;
  ruleParamsMaxSignals: number;
  catchup: number;
  intervalDuration: moment.Duration;
}): RuleRangeTuple[] => {
  const catchupTuples: RuleRangeTuple[] = [];
  const intervalInMilliseconds = intervalDuration.asMilliseconds();
  let currentTo = originalTo;
  let currentFrom = originalFrom;
  // This loop will create tuples with overlapping time ranges, the same way rule runs have overlapping time
  // ranges due to the additional lookback. We could choose to create tuples that don't overlap here by using the
  // "from" value from one tuple as "to" in the next one, however, the overlap matters for rule types like EQL and
  // threshold rules that look for sets of documents within the query. Thus we keep the overlap so that these
  // extra tuples behave as similarly to the regular rule runs as possible.
  while (catchupTuples.length < catchup) {
    const nextTo = currentTo.clone().subtract(intervalInMilliseconds);
    const nextFrom = currentFrom.clone().subtract(intervalInMilliseconds);
    catchupTuples.push({
      to: nextTo,
      from: nextFrom,
      maxSignals: ruleParamsMaxSignals,
    });
    currentTo = nextTo;
    currentFrom = nextFrom;
  }
  return catchupTuples;
};

/**
 * Given errors from a search query this will return an array of strings derived from the errors.
 * @param errors The errors to derive the strings from
 */
export const createErrorsFromShard = ({ errors }: { errors: ShardError[] }): string[] => {
  return errors.map((error) => {
    const {
      index,
      reason: {
        reason,
        type,
        caused_by: { reason: causedByReason, type: causedByType } = {
          reason: undefined,
          type: undefined,
        },
      } = {},
    } = error;

    return [
      ...(index != null ? [`index: "${index}"`] : []),
      ...(reason != null ? [`reason: "${reason}"`] : []),
      ...(type != null ? [`type: "${type}"`] : []),
      ...(causedByReason != null ? [`caused by reason: "${causedByReason}"`] : []),
      ...(causedByType != null ? [`caused by type: "${causedByType}"`] : []),
    ].join(' ');
  });
};

/**
 * Given a SignalSearchResponse this will return a valid last date if it can find one, otherwise it
 * will return undefined. This tries the "fields" first to get a formatted date time if it can, but if
 * it cannot it will resort to using the "_source" fields second which can be problematic if the date time
 * is not correctly ISO8601 or epoch milliseconds formatted.
 * @param searchResult The result to try and parse out the timestamp.
 * @param timestampOverride The timestamp override to use its values if we have it.
 */
export const lastValidDate = ({
  searchResult,
  timestampOverride,
}: {
  searchResult: SignalSearchResponse;
  timestampOverride: TimestampOverrideOrUndefined;
}): Date | undefined => {
  if (searchResult.hits.hits.length === 0) {
    return undefined;
  } else {
    const lastRecord = searchResult.hits.hits[searchResult.hits.hits.length - 1];
    return getValidDateFromDoc({ doc: lastRecord, timestampOverride });
  }
};

/**
 * Given a search hit this will return a valid last date if it can find one, otherwise it
 * will return undefined. This tries the "fields" first to get a formatted date time if it can, but if
 * it cannot it will resort to using the "_source" fields second which can be problematic if the date time
 * is not correctly ISO8601 or epoch milliseconds formatted.
 * @param searchResult The result to try and parse out the timestamp.
 * @param timestampOverride The timestamp override to use its values if we have it.
 */
export const getValidDateFromDoc = ({
  doc,
  timestampOverride,
}: {
  doc: BaseSignalHit;
  timestampOverride: TimestampOverrideOrUndefined;
}): Date | undefined => {
  const timestamp = timestampOverride ?? '@timestamp';
  const timestampValue =
    doc.fields != null && doc.fields[timestamp] != null
      ? doc.fields[timestamp][0]
      : doc._source != null
      ? (doc._source as { [key: string]: unknown })[timestamp]
      : undefined;
  const lastTimestamp =
    typeof timestampValue === 'string' || typeof timestampValue === 'number'
      ? timestampValue
      : undefined;
  if (lastTimestamp != null) {
    const tempMoment = moment(lastTimestamp);
    if (tempMoment.isValid()) {
      return tempMoment.toDate();
    } else if (typeof timestampValue === 'string') {
      // worse case we have a string from fields API or other areas of Elasticsearch that have given us a number as a string,
      // so we try one last time to parse this best we can by converting from string to a number
      const maybeDate = moment(+lastTimestamp);
      if (maybeDate.isValid()) {
        return maybeDate.toDate();
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }
};

export const createSearchAfterReturnTypeFromResponse = ({
  searchResult,
  timestampOverride,
}: {
  searchResult: SignalSearchResponse;
  timestampOverride: TimestampOverrideOrUndefined;
}): SearchAfterAndBulkCreateReturnType => {
  return createSearchAfterReturnType({
    success:
      searchResult._shards.failed === 0 ||
      searchResult._shards.failures?.every((failure) => {
        return (
          failure.reason?.reason?.includes(
            'No mapping found for [@timestamp] in order to sort on'
          ) ||
          failure.reason?.reason?.includes(
            `No mapping found for [${timestampOverride}] in order to sort on`
          )
        );
      }),
    lastLookBackDate: lastValidDate({ searchResult, timestampOverride }),
  });
};

export interface PreviewReturnType {
  totalCount: number;
  matrixHistogramData: unknown[];
  errors?: string[] | undefined;
  warningMessages?: string[] | undefined;
}

export const createPreviewReturnType = (): PreviewReturnType => ({
  matrixHistogramData: [],
  totalCount: 0,
  errors: [],
  warningMessages: [],
});

export const createSearchAfterReturnType = ({
  success,
  warning,
  searchAfterTimes,
  bulkCreateTimes,
  lastLookBackDate,
  createdSignalsCount,
  createdSignals,
  errors,
  warningMessages,
}: {
  success?: boolean | undefined;
  warning?: boolean;
  searchAfterTimes?: string[] | undefined;
  bulkCreateTimes?: string[] | undefined;
  lastLookBackDate?: Date | undefined;
  createdSignalsCount?: number | undefined;
  createdSignals?: unknown[] | undefined;
  errors?: string[] | undefined;
  warningMessages?: string[] | undefined;
} = {}): SearchAfterAndBulkCreateReturnType => {
  return {
    success: success ?? true,
    warning: warning ?? false,
    searchAfterTimes: searchAfterTimes ?? [],
    bulkCreateTimes: bulkCreateTimes ?? [],
    lastLookBackDate: lastLookBackDate ?? null,
    createdSignalsCount: createdSignalsCount ?? 0,
    createdSignals: createdSignals ?? [],
    errors: errors ?? [],
    warningMessages: warningMessages ?? [],
  };
};

export const createSearchResultReturnType = (): SignalSearchResponse => {
  const hits: SignalSourceHit[] = [];
  return {
    took: 0,
    timed_out: false,
    _shards: {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      failures: [],
    },
    hits: {
      total: 0,
      max_score: 0,
      hits,
    },
  };
};

export const mergeReturns = (
  searchAfters: SearchAfterAndBulkCreateReturnType[]
): SearchAfterAndBulkCreateReturnType => {
  return searchAfters.reduce((prev, next) => {
    const {
      success: existingSuccess,
      warning: existingWarning,
      searchAfterTimes: existingSearchAfterTimes,
      bulkCreateTimes: existingBulkCreateTimes,
      lastLookBackDate: existingLastLookBackDate,
      createdSignalsCount: existingCreatedSignalsCount,
      createdSignals: existingCreatedSignals,
      errors: existingErrors,
      warningMessages: existingWarningMessages,
    }: SearchAfterAndBulkCreateReturnType = prev;

    const {
      success: newSuccess,
      warning: newWarning,
      searchAfterTimes: newSearchAfterTimes,
      bulkCreateTimes: newBulkCreateTimes,
      lastLookBackDate: newLastLookBackDate,
      createdSignalsCount: newCreatedSignalsCount,
      createdSignals: newCreatedSignals,
      errors: newErrors,
      warningMessages: newWarningMessages,
    }: SearchAfterAndBulkCreateReturnType = next;

    return {
      success: existingSuccess && newSuccess,
      warning: existingWarning || newWarning,
      searchAfterTimes: [...existingSearchAfterTimes, ...newSearchAfterTimes],
      bulkCreateTimes: [...existingBulkCreateTimes, ...newBulkCreateTimes],
      lastLookBackDate: newLastLookBackDate ?? existingLastLookBackDate,
      createdSignalsCount: existingCreatedSignalsCount + newCreatedSignalsCount,
      createdSignals: [...existingCreatedSignals, ...newCreatedSignals],
      errors: [...new Set([...existingErrors, ...newErrors])],
      warningMessages: [...existingWarningMessages, ...newWarningMessages],
    };
  });
};

export const mergeSearchResults = (searchResults: SignalSearchResponse[]) => {
  return searchResults.reduce((prev, next) => {
    const {
      took: existingTook,
      timed_out: existingTimedOut,
      // _scroll_id: existingScrollId,
      _shards: existingShards,
      // aggregations: existingAggregations,
      hits: existingHits,
    } = prev;

    const {
      took: newTook,
      timed_out: newTimedOut,
      _scroll_id: newScrollId,
      _shards: newShards,
      aggregations: newAggregations,
      hits: newHits,
    } = next;

    return {
      took: Math.max(newTook, existingTook),
      timed_out: newTimedOut && existingTimedOut,
      _scroll_id: newScrollId,
      _shards: {
        total: newShards.total + existingShards.total,
        successful: newShards.successful + existingShards.successful,
        failed: newShards.failed + existingShards.failed,
        // @ts-expect-error @elastic/elaticsearch skipped is optional in ShardStatistics
        skipped: newShards.skipped + existingShards.skipped,
        failures: [
          ...(existingShards.failures != null ? existingShards.failures : []),
          ...(newShards.failures != null ? newShards.failures : []),
        ],
      },
      aggregations: newAggregations,
      hits: {
        total: calculateTotal(prev.hits.total, next.hits.total),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        max_score: Math.max(newHits.max_score!, existingHits.max_score!),
        hits: [...existingHits.hits, ...newHits.hits],
      },
    };
  });
};

export const getTotalHitsValue = (totalHits: number | { value: number } | undefined): number =>
  typeof totalHits === 'undefined'
    ? -1
    : typeof totalHits === 'number'
    ? totalHits
    : totalHits.value;

export const calculateTotal = (
  prevTotal: number | { value: number } | undefined,
  nextTotal: number | { value: number } | undefined
): number => {
  const prevTotalHits = getTotalHitsValue(prevTotal);
  const nextTotalHits = getTotalHitsValue(nextTotal);
  if (prevTotalHits === -1 || nextTotalHits === -1) {
    return -1;
  }
  return prevTotalHits + nextTotalHits;
};

export const calculateThresholdSignalUuid = (
  ruleId: string,
  startedAt: Date,
  thresholdFields: string[],
  key?: string
): string => {
  // used to generate constant Threshold Signals ID when run with the same params
  const NAMESPACE_ID = '0684ec03-7201-4ee0-8ee0-3a3f6b2479b2';

  const startedAtString = startedAt.toISOString();
  const keyString = key ?? '';
  const baseString = `${ruleId}${startedAtString}${thresholdFields.join(',')}${keyString}`;

  return uuidv5(baseString, NAMESPACE_ID);
};

export const getThresholdAggregationParts = (
  data: object,
  index?: number
):
  | {
      field: string;
      index: number;
      name: string;
    }
  | undefined => {
  const idx = index != null ? index.toString() : '\\d';
  const pattern = `threshold_(?<index>${idx}):(?<name>.*)`;
  for (const key of Object.keys(data)) {
    const matches = key.match(pattern);
    if (matches != null && matches.groups?.name != null && matches.groups?.index != null) {
      return {
        field: matches.groups.name,
        index: parseInt(matches.groups.index, 10),
        name: key,
      };
    }
  }
};

export const getThresholdTermsHash = (
  terms: Array<{
    field: string;
    value: string;
  }>
): string => {
  return createHash('sha256')
    .update(
      terms
        .sort((term1, term2) => (term1.field > term2.field ? 1 : -1))
        .map((field) => {
          return field.value;
        })
        .join(',')
    )
    .digest('hex');
};

export const isEqlParams = (params: RuleParams): params is EqlRuleParams => params.type === 'eql';
export const isThresholdParams = (params: RuleParams): params is ThresholdRuleParams =>
  params.type === 'threshold';
export const isQueryParams = (params: RuleParams): params is QueryRuleParams =>
  params.type === 'query';
export const isSavedQueryParams = (params: RuleParams): params is SavedQueryRuleParams =>
  params.type === 'saved_query';
export const isThreatParams = (params: RuleParams): params is ThreatRuleParams =>
  params.type === 'threat_match';
export const isMachineLearningParams = (params: RuleParams): params is MachineLearningRuleParams =>
  params.type === 'machine_learning';

/**
 * Prevent javascript from returning Number.MAX_SAFE_INTEGER when Elasticsearch expects
 * Java's Long.MAX_VALUE. This happens when sorting fields by date which are
 * unmapped in the provided index
 *
 * Ref: https://github.com/elastic/elasticsearch/issues/28806#issuecomment-369303620
 *
 * return stringified Long.MAX_VALUE if we receive Number.MAX_SAFE_INTEGER
 * @param sortIds estypes.SortResults | undefined
 * @returns SortResults
 */
export const getSafeSortIds = (sortIds: estypes.SortResults | undefined) => {
  return sortIds?.map((sortId) => {
    // haven't determined when we would receive a null value for a sort id
    // but in case we do, default to sending the stringified Java max_int
    if (sortId == null || sortId === '' || sortId >= Number.MAX_SAFE_INTEGER) {
      return '9223372036854775807';
    }
    return sortId;
  });
};

export const buildChunkedOrFilter = (field: string, values: string[], chunkSize: number = 1024) => {
  if (values.length === 0) {
    return undefined;
  }
  const chunkedValues = chunk(values, chunkSize);
  return chunkedValues
    .map((subArray) => {
      const joinedValues = subArray.map((value) => `"${value}"`).join(' OR ');
      return `${field}: (${joinedValues})`;
    })
    .join(' OR ');
};

export const isWrappedEventHit = (event: SimpleHit): event is WrappedEventHit => {
  return !isWrappedSignalHit(event) && !isWrappedDetectionAlert(event);
};

export const isWrappedSignalHit = (event: SimpleHit): event is WrappedSignalHit => {
  return (event as WrappedSignalHit)?._source?.signal != null;
};

export const isWrappedDetectionAlert = (event: SimpleHit): event is BaseHit<DetectionAlert> => {
  return (event as BaseHit<DetectionAlert>)?._source?.[ALERT_UUID] != null;
};

export const isDetectionAlert = (event: unknown): event is DetectionAlert => {
  return get(event, ALERT_UUID) != null;
};

export const racFieldMappings: Record<string, string> = {
  'signal.rule.id': ALERT_RULE_UUID,
  'signal.rule.description': `${ALERT_RULE_PARAMETERS}.description`,
  'signal.rule.filters': `${ALERT_RULE_PARAMETERS}.filters`,
  'signal.rule.language': `${ALERT_RULE_PARAMETERS}.language`,
  'signal.rule.query': `${ALERT_RULE_PARAMETERS}.query`,
  'signal.rule.risk_score': `${ALERT_RULE_PARAMETERS}.riskScore`,
  'signal.rule.severity': `${ALERT_RULE_PARAMETERS}.severity`,
  'signal.rule.building_block_type': `${ALERT_RULE_PARAMETERS}.buildingBlockType`,
  'signal.rule.namespace': `${ALERT_RULE_PARAMETERS}.namespace`,
  'signal.rule.note': `${ALERT_RULE_PARAMETERS}.note`,
  'signal.rule.license': `${ALERT_RULE_PARAMETERS}.license`,
  'signal.rule.output_index': `${ALERT_RULE_PARAMETERS}.outputIndex`,
  'signal.rule.timeline_id': `${ALERT_RULE_PARAMETERS}.timelineId`,
  'signal.rule.timeline_title': `${ALERT_RULE_PARAMETERS}.timelineTitle`,
  'signal.rule.meta': `${ALERT_RULE_PARAMETERS}.meta`,
  'signal.rule.rule_name_override': `${ALERT_RULE_PARAMETERS}.ruleNameOverride`,
  'signal.rule.timestamp_override': `${ALERT_RULE_PARAMETERS}.timestampOverride`,
  'signal.rule.author': `${ALERT_RULE_PARAMETERS}.author`,
  'signal.rule.false_positives': `${ALERT_RULE_PARAMETERS}.falsePositives`,
  'signal.rule.from': `${ALERT_RULE_PARAMETERS}.from`,
  'signal.rule.rule_id': `${ALERT_RULE_PARAMETERS}.ruleId`,
  'signal.rule.max_signals': `${ALERT_RULE_PARAMETERS}.maxSignals`,
  'signal.rule.risk_score_mapping': `${ALERT_RULE_PARAMETERS}.riskScoreMapping`,
  'signal.rule.severity_mapping': `${ALERT_RULE_PARAMETERS}.severityMapping`,
  'signal.rule.threat': `${ALERT_RULE_PARAMETERS}.threat`,
  'signal.rule.to': `${ALERT_RULE_PARAMETERS}.to`,
  'signal.rule.references': `${ALERT_RULE_PARAMETERS}.references`,
  'signal.rule.version': `${ALERT_RULE_PARAMETERS}.version`,
  'signal.rule.exceptions_list': `${ALERT_RULE_PARAMETERS}.exceptionsList`,
  'signal.rule.immutable': `${ALERT_RULE_PARAMETERS}.immutable`,
};

export const getField = (event: SimpleHit, field: string): SearchTypes | undefined => {
  if (isWrappedDetectionAlert(event)) {
    const mappedField = racFieldMappings[field] ?? field.replace('signal', 'kibana.alert');
    const parts = mappedField.split('.');
    if (mappedField.includes(ALERT_RULE_PARAMETERS) && parts[parts.length - 1] !== 'parameters') {
      const params = get(event._source, ALERT_RULE_PARAMETERS);
      return get(params, parts[parts.length - 1]);
    }
    return get(event._source, mappedField) as SearchTypes | undefined;
  } else if (isWrappedSignalHit(event)) {
    const mappedField = invert(racFieldMappings)[field] ?? field.replace('kibana.alert', 'signal');
    return get(event._source, mappedField) as SearchTypes | undefined;
  } else if (isWrappedEventHit(event)) {
    return get(event._source, field) as SearchTypes | undefined;
  }
};
