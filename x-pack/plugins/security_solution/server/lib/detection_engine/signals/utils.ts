/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createHash } from 'crypto';
import moment, { Moment } from 'moment';
import dateMath from '@elastic/datemath';

import { SavedObjectsClientContract } from '../../../../../../../src/core/server';
import { AlertServices, parseDuration } from '../../../../../alerts/server';
import { ExceptionListClient, ListClient, ListPluginSetup } from '../../../../../lists/server';
import { EntriesArray, ExceptionListItemSchema } from '../../../../../lists/common/schemas';
import { ListArrayOrUndefined } from '../../../../common/detection_engine/schemas/types/lists';
import { hasListsFeature } from '../feature_flags';
import { BulkResponse, BulkResponseErrorAggregation } from './types';
import { Logger } from '../../../../../../../src/core/server';
import { RuleTypeParams, RefreshTypes } from '../types';

interface SortExceptionsReturn {
  exceptionsWithValueLists: ExceptionListItemSchema[];
  exceptionsWithoutValueLists: ExceptionListItemSchema[];
}

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
  // TODO Remove check once feature is no longer behind flag
  if (hasListsFeature()) {
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
  } else {
    return { listClient: undefined, exceptionsClient: undefined };
  }
};

export const hasLargeValueList = (entries: EntriesArray): boolean => {
  const found = entries.filter(({ type }) => type === 'list');
  return found.length > 0;
};

export const getExceptions = async ({
  client,
  lists,
}: {
  client: ExceptionListClient | undefined;
  lists: ListArrayOrUndefined;
}): Promise<ExceptionListItemSchema[] | undefined> => {
  // TODO Remove check once feature is no longer behind flag
  if (hasListsFeature()) {
    if (client == null) {
      throw new Error('lists plugin unavailable during rule execution');
    }

    if (lists != null) {
      try {
        // Gather all exception items of all exception lists linked to rule
        const exceptions = await Promise.all(
          lists
            .map(async (list) => {
              const { id, namespace_type: namespaceType } = list;
              const items = await client.findExceptionListItem({
                listId: id,
                namespaceType,
                page: 1,
                perPage: 5000,
                filter: undefined,
                sortOrder: undefined,
                sortField: undefined,
              });
              return items != null ? items.data : [];
            })
            .flat()
        );
        return exceptions.flat();
      } catch {
        return [];
      }
    }
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

export const parseScheduleDates = (time: string): moment.Moment | null => {
  const isValidDateString = !isNaN(Date.parse(time));
  const isValidInput = isValidDateString || time.trim().startsWith('now');
  const formattedDate = isValidDateString
    ? moment(time)
    : isValidInput
    ? dateMath.parse(time)
    : null;

  return formattedDate ?? null;
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

export const getSignalTimeTuples = ({
  logger,
  ruleParams,
  gap,
  previousStartedAt,
  interval,
}: // maxResults,
{
  logger: Logger;
  ruleParams: RuleTypeParams;
  gap: moment.Duration | null;
  previousStartedAt: Date | null | undefined;
  interval: string;
  // maxResults: number;
}): Array<{
  to: moment.Moment | undefined;
  from: moment.Moment | undefined;
  maxSignals: number;
}> => {
  type unitType = 's' | 'm' | 'h';
  const isValidUnit = (unit: string): unit is unitType => ['s', 'm', 'h'].includes(unit);
  // add a 'gap' parameter that would add the
  // 'from' with the 'gap' - need to figure out
  // how to do datemath with moment.
  let calculatedFrom = ruleParams.from;
  let totalToFromTuples: Array<{
    to: moment.Moment | undefined;
    from: moment.Moment | undefined;
    maxSignals: number;
  }> = [];
  if (gap != null && previousStartedAt != null) {
    const fromUnit = ruleParams.from[ruleParams.from.length - 1];
    if (isValidUnit(fromUnit)) {
      const unit = fromUnit; // only seconds (s), minutes (m) or hours (h)
      const shorthandMap = {
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
      const tempNow = moment();
      // const newFrom = moment.duration(300, 's');
      const newFrom = moment.duration(tempNow.diff(previousStartedAt));
      logger.debug(`newFrom: ${newFrom.asSeconds()}`);
      const parsed = parseInt(shorthandMap[unit].asFn(newFrom).toString(), 10);

      calculatedFrom = `now-${parsed + unit}`;
      logger.debug(`calculatedFrom: ${calculatedFrom}`);
      const intervalMoment = moment.duration(parseInt(interval, 10), unit);
      const calculatedFromAsMoment = dateMath.parse(calculatedFrom);
      const calculatedNowAsMoment = dateMath.parse('now');
      if (
        calculatedFromAsMoment != null &&
        calculatedNowAsMoment != null &&
        intervalMoment != null
      ) {
        // calculate new max signals so that we keep constant max signals per time interval
        // essentially if the rule is supposed to run every 5 minutes,
        //  but there is a gap of one minute, then the number of rule executions missed
        // due to the gap are (6 minutes - 5 minutes) / 5 minutes = 0.2 * MAX_SIGNALS = 20 signals allowed.
        // this is to keep our ratio of MAX_SIGNALS : rule intervals equivalent.
        const dateMathRuleParamsFrom = dateMath.parse(ruleParams.from);
        const momentUnit = shorthandMap[unit].momentString as moment.DurationInputArg2;
        logger.debug(
          `calculatedFromAsMoment: ${calculatedFromAsMoment.toISOString()}, calculatedNowAsMoment: ${calculatedNowAsMoment.toISOString()}`
        );
        const gapDiffInUnits = calculatedFromAsMoment.diff(dateMathRuleParamsFrom, momentUnit);
        // I think we can replace this with the interval?
        const normalDiffInUnits = calculatedNowAsMoment.diff(dateMathRuleParamsFrom, momentUnit);

        logger.debug(`gapDiffInUnits: ${gapDiffInUnits}, normalDiffInUnits: ${normalDiffInUnits}`);
        // make an array that represents the number of intervals of (to, from) tuples
        const ratio = Math.abs(gapDiffInUnits / normalDiffInUnits);
        // maxCatchup is to ensure we are not trying to catch up too far back.
        // This allows for a maximum of 4 consecutive rule execution misses
        // to be included in the number of signals generated.
        const maxCatchup = ratio < 4 ? ratio : 4;

        // take the `xunit` from the `now-xunit` datemath string and append another interval
        // to the `x`
        /*
        basic algorithm will be a recurrence relation such that
        the end point for one range becomes the start point for
        the next range. subtract the intervalMoment from the `to` field
        to get the next `from`, then on the next iteration, set the `to` field
        to be the `from` field, then subtract intervalMoment from the `to` field to get
        the next `from` field, then on the next iteration, set the `to` field
        to be the `from` field, then subtract the intervalMoment from the `to field to get
        the next `from` field.
        */
        // let tempFrom = dateMath.parse(ruleParams.from);
        // let tempFrom;
        let tempTo = dateMath.parse(ruleParams.from);
        if (tempTo == null) {
          // return an error
          throw new Error('dateMath parse failed');
        }
        // totalToFromTuples.push({ to: tempTo, from: tempFrom });
        // consider re-writing as a reduce function?
        // maybe in a separate utils file?
        // this way it is easier to test?
        // but then again I'll be testing timestamps which is ANNOYING
        // UGH
        // I guess the way I would test this is ensure the returned
        // length of totalToFromTuples is greater than 0
        // and all the `to` and `from` values in each tuple
        // are differentiated by the given `intervalMoment`.
        // this way I am not strictly checking for timestamps
        // but the difference between the two.
        // subtracting 1 from the length because we start out with the
        // normal interval tuple, so don't include as part of the
        // maxCatchup.
        logger.debug(`maxCatchup: ${maxCatchup}`);
        let beforeMutatedFrom: moment.Moment | undefined;
        while (totalToFromTuples.length < maxCatchup) {
          // if maxCatchup is less than 1, we calculate the 'from' differently
          // and maxSignals becomes some less amount of maxSignals
          // in order to maintain maxSignals per full rule interval.
          if (maxCatchup > 0 && maxCatchup < 1) {
            totalToFromTuples.push({
              to: moment(tempTo),
              from: moment(tempTo.subtract(Math.abs(gapDiffInUnits), momentUnit)),
              maxSignals: ruleParams.maxSignals * maxCatchup,
            });
            break;
          }
          logger.debug(`tempTo: ${tempTo.toISOString()}`);
          const beforeMutatedTo = tempTo.clone(); // make a new moment
          const tempToClone = tempTo.clone();
          logger.debug(`intervalMoment: ${intervalMoment.asSeconds()}`);
          beforeMutatedFrom = moment(tempToClone.subtract(intervalMoment, momentUnit));
          const tuple = {
            to: beforeMutatedTo,
            from: beforeMutatedFrom,
            maxSignals: ruleParams.maxSignals,
          };
          logger.debug(
            `tuple: ${JSON.stringify(
              tuple,
              (_, value) => (typeof value === 'undefined' ? null : value),
              4
            )}`
          );
          totalToFromTuples = [...totalToFromTuples, tuple];
          logger.debug(
            `totalToFromTuples: ${JSON.stringify(
              totalToFromTuples,
              (_, value) => (typeof value === 'undefined' ? null : value),
              4
            )}`
          );
          tempTo = beforeMutatedFrom;
        }
        totalToFromTuples = [
          {
            to: dateMath.parse(ruleParams.to),
            from: dateMath.parse(ruleParams.from),
            maxSignals: ruleParams.maxSignals,
          },
          ...totalToFromTuples,
        ];

        // create a new max results which in the above example equates to
        // 20 signals as the MAX_SIGNALS for the gap duration + our normal MAX_SIGNALS defaulted to 100
        // which comes out to 120 total max signals.
        // maxResults = Math.round(maxCatchup * ruleParams.maxSignals) + ruleParams.maxSignals;
        // logger.debug(`new maxResults: ${maxResults}`);
      }
    }
  } else {
    totalToFromTuples.push({
      to: moment(ruleParams.to),
      from: moment(ruleParams.from),
      maxSignals: ruleParams.maxSignals,
    });
  }
  return totalToFromTuples;
};
