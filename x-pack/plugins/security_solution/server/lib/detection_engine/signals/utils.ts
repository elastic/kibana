/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import moment from 'moment';
import uuidv5 from 'uuid/v5';
import dateMath from '@elastic/datemath';
import { isEmpty, partition } from 'lodash';
import { ApiResponse, Context } from '@elastic/elasticsearch/lib/Transport';

import {
  TimestampOverrideOrUndefined,
  Privilege,
} from '../../../../common/detection_engine/schemas/common/schemas';
import { Logger, SavedObjectsClientContract } from '../../../../../../../src/core/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
  parseDuration,
} from '../../../../../alerting/server';
import { ExceptionListClient, ListClient, ListPluginSetup } from '../../../../../lists/server';
import { ExceptionListItemSchema } from '../../../../../lists/common/schemas';
import { ListArray } from '../../../../common/detection_engine/schemas/types/lists';
import {
  BulkResponse,
  BulkResponseErrorAggregation,
  SignalHit,
  SearchAfterAndBulkCreateReturnType,
  SignalSearchResponse,
  Signal,
  WrappedSignalHit,
  RuleRangeTuple,
} from './types';
import { BuildRuleMessage } from './rule_messages';
import { parseScheduleDates } from '../../../../common/detection_engine/parse_schedule_dates';
import { hasLargeValueList } from '../../../../common/detection_engine/utils';
import { MAX_EXCEPTION_LIST_SIZE } from '../../../../../lists/common/constants';
import { ShardError } from '../../types';
import { RuleStatusService } from './rule_status_service';

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

export const hasReadIndexPrivileges = async (
  privileges: Privilege,
  logger: Logger,
  buildRuleMessage: BuildRuleMessage,
  ruleStatusService: RuleStatusService
): Promise<boolean> => {
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
    await ruleStatusService.partialFailure(errorString);
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
    await ruleStatusService.partialFailure(errorString);
    return true;
  }
  return false;
};

export const hasTimestampFields = async (
  wroteStatus: boolean,
  timestampField: string,
  ruleName: string,
  // any is derived from here
  // node_modules/@elastic/elasticsearch/api/kibana.d.ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timestampFieldCapsResponse: ApiResponse<Record<string, any>, Context>,
  inputIndices: string[],
  ruleStatusService: RuleStatusService,
  logger: Logger,
  buildRuleMessage: BuildRuleMessage
): Promise<boolean> => {
  if (!wroteStatus && isEmpty(timestampFieldCapsResponse.body.indices)) {
    const errorString = `This rule is attempting to query data from Elasticsearch indices listed in the "Index pattern" section of the rule definition, however no index matching: ${JSON.stringify(
      inputIndices
    )} was found. This warning will continue to appear until a matching index is created or this rule is de-activated. ${
      ruleName === 'Endpoint Security'
        ? 'If you have recently enrolled agents enabled with Endpoint Security through Fleet, this warning should stop once an alert is sent from an agent.'
        : ''
    }`;
    logger.error(buildRuleMessage(errorString.trimEnd()));
    await ruleStatusService.partialFailure(errorString.trimEnd());
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
    await ruleStatusService.partialFailure(errorString);
    return true;
  }
  return wroteStatus;
};

export const checkPrivileges = async (
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>,
  indices: string[]
): Promise<Privilege> =>
  (
    await services.scopedClusterClient.asCurrentUser.transport.request({
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
}): Promise<ExceptionListItemSchema[] | undefined> => {
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
    _source: {
      ...signal,
    },
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
  response: BulkResponse,
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
    const timestamp = timestampOverride ?? '@timestamp';
    const timestampValue =
      lastRecord.fields != null && lastRecord.fields[timestamp] != null
        ? lastRecord.fields[timestamp][0]
        : lastRecord._source[timestamp];
    const lastTimestamp =
      typeof timestampValue === 'string' || typeof timestampValue === 'number'
        ? timestampValue
        : undefined;
    if (lastTimestamp != null) {
      const tempMoment = moment(lastTimestamp);
      if (tempMoment.isValid()) {
        return tempMoment.toDate();
      } else {
        return undefined;
      }
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
  searchAfterTimes,
  bulkCreateTimes,
  lastLookBackDate,
  createdSignalsCount,
  createdSignals,
  errors,
}: {
  success?: boolean | undefined;
  searchAfterTimes?: string[] | undefined;
  bulkCreateTimes?: string[] | undefined;
  lastLookBackDate?: Date | undefined;
  createdSignalsCount?: number | undefined;
  createdSignals?: SignalHit[] | undefined;
  errors?: string[] | undefined;
} = {}): SearchAfterAndBulkCreateReturnType => {
  return {
    success: success ?? true,
    searchAfterTimes: searchAfterTimes ?? [],
    bulkCreateTimes: bulkCreateTimes ?? [],
    lastLookBackDate: lastLookBackDate ?? null,
    createdSignalsCount: createdSignalsCount ?? 0,
    createdSignals: createdSignals ?? [],
    errors: errors ?? [],
  };
};

export const createSearchResultReturnType = (): SignalSearchResponse => {
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
      hits: [],
    },
  };
};

export const mergeReturns = (
  searchAfters: SearchAfterAndBulkCreateReturnType[]
): SearchAfterAndBulkCreateReturnType => {
  return searchAfters.reduce((prev, next) => {
    const {
      success: existingSuccess,
      searchAfterTimes: existingSearchAfterTimes,
      bulkCreateTimes: existingBulkCreateTimes,
      lastLookBackDate: existingLastLookBackDate,
      createdSignalsCount: existingCreatedSignalsCount,
      createdSignals: existingCreatedSignals,
      errors: existingErrors,
    } = prev;

    const {
      success: newSuccess,
      searchAfterTimes: newSearchAfterTimes,
      bulkCreateTimes: newBulkCreateTimes,
      lastLookBackDate: newLastLookBackDate,
      createdSignalsCount: newCreatedSignalsCount,
      createdSignals: newCreatedSignals,
      errors: newErrors,
    } = next;

    return {
      success: existingSuccess && newSuccess,
      searchAfterTimes: [...existingSearchAfterTimes, ...newSearchAfterTimes],
      bulkCreateTimes: [...existingBulkCreateTimes, ...newBulkCreateTimes],
      lastLookBackDate: newLastLookBackDate ?? existingLastLookBackDate,
      createdSignalsCount: existingCreatedSignalsCount + newCreatedSignalsCount,
      createdSignals: [...existingCreatedSignals, ...newCreatedSignals],
      errors: [...new Set([...existingErrors, ...newErrors])],
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
        skipped: newShards.skipped + existingShards.skipped,
        failures: [
          ...(existingShards.failures != null ? existingShards.failures : []),
          ...(newShards.failures != null ? newShards.failures : []),
        ],
      },
      aggregations: newAggregations,
      hits: {
        total:
          createTotalHitsFromSearchResult({ searchResult: prev }) +
          createTotalHitsFromSearchResult({ searchResult: next }),
        max_score: Math.max(newHits.max_score, existingHits.max_score),
        hits: [...existingHits.hits, ...newHits.hits],
      },
    };
  });
};

export const createTotalHitsFromSearchResult = ({
  searchResult,
}: {
  searchResult: SignalSearchResponse;
}): number => {
  const totalHits =
    typeof searchResult.hits.total === 'number'
      ? searchResult.hits.total
      : searchResult.hits.total.value;
  return totalHits;
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
