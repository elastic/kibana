/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createHash } from 'crypto';
import moment from 'moment';
import dateMath from '@elastic/datemath';

import { Logger, SavedObjectsClientContract } from '../../../../../../../src/core/server';
import { AlertServices, parseDuration } from '../../../../../alerts/server';
import { ExceptionListClient, ListClient, ListPluginSetup } from '../../../../../lists/server';
import { ExceptionListItemSchema } from '../../../../../lists/common/schemas';
import { ListArrayOrUndefined } from '../../../../common/detection_engine/schemas/types/lists';
import { BulkResponse, BulkResponseErrorAggregation, isValidUnit } from './types';
import { BuildRuleMessage } from './rule_messages';
import { hasLargeValueList, parseScheduleDates } from '../../../../common/detection_engine/utils';
import { MAX_EXCEPTION_LIST_SIZE } from '../../../../../lists/common/constants';

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

export const getGapMaxCatchupRatio = ({
  logger,
  previousStartedAt,
  unit,
  buildRuleMessage,
  ruleParamsFrom,
  interval,
}: {
  logger: Logger;
  ruleParamsFrom: string;
  previousStartedAt: Date | null | undefined;
  interval: string;
  buildRuleMessage: BuildRuleMessage;
  unit: string;
}): {
  maxCatchup: number | null;
  ratio: number | null;
  gapDiffInUnits: number | null;
} => {
  if (previousStartedAt == null) {
    return {
      maxCatchup: null,
      ratio: null,
      gapDiffInUnits: null,
    };
  }
  if (!isValidUnit(unit)) {
    logger.error(buildRuleMessage(`unit: ${unit} failed isValidUnit check`));
    return {
      maxCatchup: null,
      ratio: null,
      gapDiffInUnits: null,
    };
  }
  /*
      we need the total duration from now until the last time the rule ran.
      the next few lines can be summed up as calculating
      "how many second | minutes | hours have passed since the last time this ran?"
      */
  const nowToGapDiff = moment.duration(moment().diff(previousStartedAt));
  // rule ran early, no gap
  if (shorthandMap[unit].asFn(nowToGapDiff) < 0) {
    // rule ran early, no gap
    return {
      maxCatchup: null,
      ratio: null,
      gapDiffInUnits: null,
    };
  }
  const calculatedFrom = `now-${
    parseInt(shorthandMap[unit].asFn(nowToGapDiff).toString(), 10) + unit
  }`;
  logger.debug(buildRuleMessage(`calculatedFrom: ${calculatedFrom}`));

  const intervalMoment = moment.duration(parseInt(interval, 10), unit);
  logger.debug(buildRuleMessage(`intervalMoment: ${shorthandMap[unit].asFn(intervalMoment)}`));
  const calculatedFromAsMoment = dateMath.parse(calculatedFrom);
  const dateMathRuleParamsFrom = dateMath.parse(ruleParamsFrom);
  if (dateMathRuleParamsFrom != null && intervalMoment != null) {
    const momentUnit = shorthandMap[unit].momentString as moment.DurationInputArg2;
    const gapDiffInUnits = dateMathRuleParamsFrom.diff(calculatedFromAsMoment, momentUnit);

    const ratio = gapDiffInUnits / shorthandMap[unit].asFn(intervalMoment);

    // maxCatchup is to ensure we are not trying to catch up too far back.
    // This allows for a maximum of 4 consecutive rule execution misses
    // to be included in the number of signals generated.
    const maxCatchup = ratio < MAX_RULE_GAP_RATIO ? ratio : MAX_RULE_GAP_RATIO;
    return { maxCatchup, ratio, gapDiffInUnits };
  }
  logger.error(buildRuleMessage('failed to parse calculatedFrom and intervalMoment'));
  return {
    maxCatchup: null,
    ratio: null,
    gapDiffInUnits: null,
  };
};

export const getListsClient = async ({
  lists,
  spaceId,
  updatedByUser,
  services,
  savedObjectClient,
}: {
  lists: ListPluginSetup | undefined;
  spaceId: string;
  updatedByUser: string | null;
  services: AlertServices;
  savedObjectClient: SavedObjectsClientContract;
}): Promise<{
  listClient: ListClient | undefined;
  exceptionsClient: ExceptionListClient | undefined;
}> => {
  if (lists == null) {
    throw new Error('lists plugin unavailable during rule execution');
  }

  const listClient = await lists.getListClient(
    services.callCluster,
    spaceId,
    updatedByUser ?? 'elastic'
  );
  const exceptionsClient = await lists.getExceptionListClient(
    savedObjectClient,
    updatedByUser ?? 'elastic'
  );

  return { listClient, exceptionsClient };
};

export const getExceptions = async ({
  client,
  lists,
}: {
  client: ExceptionListClient | undefined;
  lists: ListArrayOrUndefined;
}): Promise<ExceptionListItemSchema[] | undefined> => {
  if (client == null) {
    throw new Error('lists plugin unavailable during rule execution');
  }

  if (lists != null && lists.length > 0) {
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
  interval,
  now = moment(),
}: {
  from: string;
  to: string;
  interval: moment.Duration;
  now?: moment.Moment;
}): moment.Duration | null => {
  const toDate = parseScheduleDates(to) ?? now;
  const fromDate = parseScheduleDates(from) ?? dateMath.parse('now-6m');
  const timeSegment = toDate.diff(fromDate);
  const duration = moment.duration(timeSegment);

  if (duration !== null) {
    return duration.subtract(interval);
  } else {
    return null;
  }
};

export const getGapBetweenRuns = ({
  previousStartedAt,
  interval,
  from,
  to,
  now = moment(),
}: {
  previousStartedAt: Date | undefined | null;
  interval: string;
  from: string;
  to: string;
  now?: moment.Moment;
}): moment.Duration | null => {
  if (previousStartedAt == null) {
    return null;
  }
  const intervalDuration = parseInterval(interval);
  if (intervalDuration == null) {
    return null;
  }
  const driftTolerance = getDriftTolerance({ from, to, interval: intervalDuration });
  if (driftTolerance == null) {
    return null;
  }
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
    if (item.create.error != null && !ignoreStatusCodes.includes(item.create.status)) {
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

/**
 * Determines the number of time intervals to search if gap is present
 * along with new maxSignals per time interval.
 * @param logger Logger
 * @param ruleParamsFrom string representing the rules 'from' property
 * @param ruleParamsTo string representing the rules 'to' property
 * @param ruleParamsMaxSignals int representing the maxSignals property on the rule (usually unmodified at 100)
 * @param gap moment.Duration representing a gap in since the last time the rule ran
 * @param previousStartedAt Date at which the rule last ran
 * @param interval string the interval which the rule runs
 * @param buildRuleMessage function provides meta information for logged event
 */
export const getSignalTimeTuples = ({
  logger,
  ruleParamsFrom,
  ruleParamsTo,
  ruleParamsMaxSignals,
  gap,
  previousStartedAt,
  interval,
  buildRuleMessage,
}: {
  logger: Logger;
  ruleParamsFrom: string;
  ruleParamsTo: string;
  ruleParamsMaxSignals: number;
  gap: moment.Duration | null;
  previousStartedAt: Date | null | undefined;
  interval: string;
  buildRuleMessage: BuildRuleMessage;
}): Array<{
  to: moment.Moment | undefined;
  from: moment.Moment | undefined;
  maxSignals: number;
}> => {
  let totalToFromTuples: Array<{
    to: moment.Moment | undefined;
    from: moment.Moment | undefined;
    maxSignals: number;
  }> = [];
  if (gap != null && gap.valueOf() > 0 && previousStartedAt != null) {
    const fromUnit = ruleParamsFrom[ruleParamsFrom.length - 1];
    if (isValidUnit(fromUnit)) {
      const unit = fromUnit; // only seconds (s), minutes (m) or hours (h)

      /*
      we need the total duration from now until the last time the rule ran.
      the next few lines can be summed up as calculating
      "how many second | minutes | hours have passed since the last time this ran?"
      */
      const nowToGapDiff = moment.duration(moment().diff(previousStartedAt));
      const calculatedFrom = `now-${
        parseInt(shorthandMap[unit].asFn(nowToGapDiff).toString(), 10) + unit
      }`;
      logger.debug(buildRuleMessage(`calculatedFrom: ${calculatedFrom}`));

      const intervalMoment = moment.duration(parseInt(interval, 10), unit);
      logger.debug(buildRuleMessage(`intervalMoment: ${shorthandMap[unit].asFn(intervalMoment)}`));
      const momentUnit = shorthandMap[unit].momentString as moment.DurationInputArg2;
      // maxCatchup is to ensure we are not trying to catch up too far back.
      // This allows for a maximum of 4 consecutive rule execution misses
      // to be included in the number of signals generated.
      const { maxCatchup, ratio, gapDiffInUnits } = getGapMaxCatchupRatio({
        logger,
        buildRuleMessage,
        previousStartedAt,
        unit,
        ruleParamsFrom,
        interval,
      });
      logger.debug(buildRuleMessage(`maxCatchup: ${maxCatchup}, ratio: ${ratio}`));
      if (maxCatchup == null || ratio == null || gapDiffInUnits == null) {
        throw new Error(
          buildRuleMessage('failed to calculate maxCatchup, ratio, or gapDiffInUnits')
        );
      }
      let tempTo = dateMath.parse(ruleParamsFrom);
      if (tempTo == null) {
        // return an error
        throw new Error(buildRuleMessage('dateMath parse failed'));
      }

      let beforeMutatedFrom: moment.Moment | undefined;
      while (totalToFromTuples.length < maxCatchup) {
        // if maxCatchup is less than 1, we calculate the 'from' differently
        // and maxSignals becomes some less amount of maxSignals
        // in order to maintain maxSignals per full rule interval.
        if (maxCatchup > 0 && maxCatchup < 1) {
          totalToFromTuples.push({
            to: tempTo.clone(),
            from: tempTo.clone().subtract(gapDiffInUnits, momentUnit),
            maxSignals: ruleParamsMaxSignals * maxCatchup,
          });
          break;
        }
        const beforeMutatedTo = tempTo.clone();

        // moment.subtract mutates the moment so we need to clone again..
        beforeMutatedFrom = tempTo.clone().subtract(intervalMoment, momentUnit);
        const tuple = {
          to: beforeMutatedTo,
          from: beforeMutatedFrom,
          maxSignals: ruleParamsMaxSignals,
        };
        totalToFromTuples = [...totalToFromTuples, tuple];
        tempTo = beforeMutatedFrom;
      }
      totalToFromTuples = [
        {
          to: dateMath.parse(ruleParamsTo),
          from: dateMath.parse(ruleParamsFrom),
          maxSignals: ruleParamsMaxSignals,
        },
        ...totalToFromTuples,
      ];
    }
  } else {
    totalToFromTuples = [
      {
        to: dateMath.parse(ruleParamsTo),
        from: dateMath.parse(ruleParamsFrom),
        maxSignals: ruleParamsMaxSignals,
      },
    ];
  }
  logger.debug(
    buildRuleMessage(`totalToFromTuples: ${JSON.stringify(totalToFromTuples, null, 4)}`)
  );
  return totalToFromTuples;
};
