/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createHash } from 'crypto';
import { chunk, get, isEmpty, partition } from 'lodash';
import moment from 'moment';
import uuidv5 from 'uuid/v5';

import dateMath from '@elastic/datemath';
import type { estypes } from '@elastic/elasticsearch';
import { ApiResponse, Context } from '@elastic/elasticsearch/lib/Transport';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { ListArray, ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { MAX_EXCEPTION_LIST_SIZE } from '@kbn/securitysolution-list-constants';
import { hasLargeValueList } from '@kbn/securitysolution-list-utils';
import { parseScheduleDates } from '@kbn/securitysolution-io-ts-utils';

import {
  TimestampOverrideOrUndefined,
  Privilege,
  RuleExecutionStatus,
} from '../../../../common/detection_engine/schemas/common/schemas';
import {
  ElasticsearchClient,
  Logger,
  SavedObjectsClientContract,
} from '../../../../../../../src/core/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
  parseDuration,
} from '../../../../../alerting/server';
import { ExceptionListClient, ListClient, ListPluginSetup } from '../../../../../lists/server';
import {
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
import { BuildRuleMessage } from './rule_messages';
import { ShardError } from '../../types';
import {
  EqlRuleParams,
  MachineLearningRuleParams,
  QueryRuleParams,
  RuleParams,
  SavedQueryRuleParams,
  ThreatRuleParams,
  ThresholdRuleParams,
} from '../schemas/rule_schemas';
import { WrappedRACAlert } from '../rule_types/types';
import { SearchTypes } from '../../../../common/detection_engine/types';
import { IRuleExecutionLogClient } from '../rule_execution_log/types';
import {
  EQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SIGNALS_ID,
  THRESHOLD_RULE_TYPE_ID,
} from '../../../../common/constants';

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
  ruleStatusClient: IRuleExecutionLogClient;
  ruleId: string;
  spaceId: string;
}): Promise<boolean> => {
  const { privileges, logger, buildRuleMessage, ruleStatusClient, ruleId, spaceId } = args;

  const indexNames = Object.keys(privileges.index);
  const [indexesWithReadPrivileges, indexesWithNoReadPrivileges] = partition(
    indexNames,
    (indexName) => privileges.index[indexName].read
  );

  if (indexesWithReadPrivileges.length > 0 && indexesWithNoReadPrivileges.length > 0) {
    // some indices have read privileges others do not.
    // set a warning status
    const errorString = `Missing required read privileges on the following indices: ${JSON.stringify(
      indexesWithNoReadPrivileges
    )}`;
    logger.error(buildRuleMessage(errorString));
    await ruleStatusClient.logStatusChange({
      message: errorString,
      ruleId,
      spaceId,
      newStatus: RuleExecutionStatus['partial failure'],
    });
    return true;
  } else if (
    indexesWithReadPrivileges.length === 0 &&
    indexesWithNoReadPrivileges.length === indexNames.length
  ) {
    // none of the indices had read privileges so set the status to failed
    // since we can't search on any indices we do not have read privileges on
    const errorString = `This rule may not have the required read privileges to the following indices: ${JSON.stringify(
      indexesWithNoReadPrivileges
    )}`;
    logger.error(buildRuleMessage(errorString));
    await ruleStatusClient.logStatusChange({
      message: errorString,
      ruleId,
      spaceId,
      newStatus: RuleExecutionStatus['partial failure'],
    });
    return true;
  }
  return false;
};

export const hasTimestampFields = async (args: {
  wroteStatus: boolean;
  timestampField: string;
  ruleName: string;
  // any is derived from here
  // node_modules/@elastic/elasticsearch/api/kibana.d.ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timestampFieldCapsResponse: ApiResponse<Record<string, any>, Context>;
  inputIndices: string[];
  ruleStatusClient: IRuleExecutionLogClient;
  ruleId: string;
  spaceId: string;
  logger: Logger;
  buildRuleMessage: BuildRuleMessage;
}): Promise<boolean> => {
  const {
    wroteStatus,
    timestampField,
    ruleName,
    timestampFieldCapsResponse,
    inputIndices,
    ruleStatusClient,
    ruleId,
    spaceId,
    logger,
    buildRuleMessage,
  } = args;

  if (!wroteStatus && isEmpty(timestampFieldCapsResponse.body.indices)) {
    const errorString = `This rule is attempting to query data from Elasticsearch indices listed in the "Index pattern" section of the rule definition, however no index matching: ${JSON.stringify(
      inputIndices
    )} was found. This warning will continue to appear until a matching index is created or this rule is de-activated. ${
      ruleName === 'Endpoint Security'
        ? 'If you have recently enrolled agents enabled with Endpoint Security through Fleet, this warning should stop once an alert is sent from an agent.'
        : ''
    }`;
    logger.error(buildRuleMessage(errorString.trimEnd()));
    await ruleStatusClient.logStatusChange({
      message: errorString.trimEnd(),
      ruleId,
      spaceId,
      newStatus: RuleExecutionStatus['partial failure'],
    });
    return true;
  } else if (
    !wroteStatus &&
    (isEmpty(timestampFieldCapsResponse.body.fields) ||
      timestampFieldCapsResponse.body.fields[timestampField] == null ||
      timestampFieldCapsResponse.body.fields[timestampField]?.unmapped?.indices != null)
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
    logger.error(buildRuleMessage(errorString));
    await ruleStatusClient.logStatusChange({
      message: errorString,
      ruleId,
      spaceId,
      newStatus: RuleExecutionStatus['partial failure'],
    });
    return true;
  }
  return wroteStatus;
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
  (
    await esClient.transport.request({
      path: '/_security/user/_has_privileges',
      method: 'POST',
      body: {
        index: [
          {
            names: indices ?? [],
            privileges: ['read'],
          },
        ],
      },
    })
  ).body as Privilege;

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
      const items = await client.findExceptionListsItem({
        listId: listIds,
        namespaceType: namespaceTypes,
        page: 1,
        perPage: MAX_EXCEPTION_LIST_SIZE,
        filter: [],
        sortOrder: undefined,
        sortField: undefined,
      });
      return items != null ? items.data : [];
    } catch {
      throw new Error('unable to fetch exception list items');
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

export const getDriftTolerance = ({
  from,
  to,
  intervalDuration,
  now = moment(),
}: {
  from: string;
  to: string;
  intervalDuration: moment.Duration;
  now?: moment.Moment;
}): moment.Duration => {
  const toDate = parseScheduleDates(to) ?? now;
  const fromDate = parseScheduleDates(from) ?? dateMath.parse('now-6m');
  const timeSegment = toDate.diff(fromDate);
  const duration = moment.duration(timeSegment);

  return duration.subtract(intervalDuration);
};

export const getGapBetweenRuns = ({
  previousStartedAt,
  intervalDuration,
  from,
  to,
  now = moment(),
}: {
  previousStartedAt: Date | undefined | null;
  intervalDuration: moment.Duration;
  from: string;
  to: string;
  now?: moment.Moment;
}): moment.Duration => {
  if (previousStartedAt == null) {
    return moment.duration(0);
  }
  const driftTolerance = getDriftTolerance({ from, to, intervalDuration });

  const diff = moment.duration(now.diff(previousStartedAt));
  const drift = diff.subtract(intervalDuration);
  return drift.subtract(driftTolerance);
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
}: {
  logger: Logger;
  previousStartedAt: Date | null | undefined;
  from: string;
  to: string;
  interval: string;
  maxSignals: number;
  buildRuleMessage: BuildRuleMessage;
}) => {
  const originalTo = dateMath.parse(to);
  const originalFrom = dateMath.parse(from);
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
  const gap = getGapBetweenRuns({ previousStartedAt, intervalDuration, from, to });
  const catchup = getNumCatchupIntervals({
    gap,
    intervalDuration,
  });
  const catchupTuples = getCatchupTuples({
    to: originalTo,
    from: originalFrom,
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
  to,
  from,
  ruleParamsMaxSignals,
  catchup,
  intervalDuration,
}: {
  to: moment.Moment;
  from: moment.Moment;
  ruleParamsMaxSignals: number;
  catchup: number;
  intervalDuration: moment.Duration;
}): RuleRangeTuple[] => {
  const catchupTuples: RuleRangeTuple[] = [];
  const intervalInMilliseconds = intervalDuration.asMilliseconds();
  let currentTo = to;
  let currentFrom = from;
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
 * @param sortIds estypes.SearchSortResults | undefined
 * @returns SortResults
 */
export const getSafeSortIds = (sortIds: estypes.SearchSortResults | undefined) => {
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
  return !isWrappedSignalHit(event) && !isWrappedRACAlert(event);
};

export const isWrappedSignalHit = (event: SimpleHit): event is WrappedSignalHit => {
  return (event as WrappedSignalHit)?._source?.signal != null;
};

export const isWrappedRACAlert = (event: SimpleHit): event is WrappedRACAlert => {
  return (event as WrappedRACAlert)?._source?.[ALERT_INSTANCE_ID] != null;
};

export const racFieldMappings: Record<string, string> = {
  'signal.rule.id': ALERT_RULE_UUID,
};

export const getField = <T extends SearchTypes>(event: SimpleHit, field: string): T | undefined => {
  if (isWrappedRACAlert(event)) {
    const mappedField = racFieldMappings[field] ?? field.replace('signal', 'kibana.alert');
    return get(event._source, mappedField) as T;
  } else if (isWrappedSignalHit(event)) {
    return get(event._source, field) as T;
  } else if (isWrappedEventHit(event)) {
    return get(event._source, field) as T;
  }
};

/**
 * Maps legacy rule types to RAC rule type IDs.
 */
export const ruleTypeMappings = {
  eql: EQL_RULE_TYPE_ID,
  machine_learning: ML_RULE_TYPE_ID,
  query: QUERY_RULE_TYPE_ID,
  saved_query: SIGNALS_ID,
  threat_match: INDICATOR_RULE_TYPE_ID,
  threshold: THRESHOLD_RULE_TYPE_ID,
};
