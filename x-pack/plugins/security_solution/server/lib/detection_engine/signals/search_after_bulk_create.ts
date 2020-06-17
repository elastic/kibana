/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable complexity */

import moment from 'moment';
import dateMath from '@elastic/datemath';

import { ListAndOrUndefined } from '../../../../common/detection_engine/schemas/common/schemas';
import { AlertServices } from '../../../../../alerts/server';
import { ListClient } from '../../../../../lists/server';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { RuleTypeParams, RefreshTypes } from '../types';
import { Logger } from '../../../../../../../src/core/server';
import { singleSearchAfter } from './single_search_after';
import { singleBulkCreate } from './single_bulk_create';
import { SignalSearchResponse } from './types';
import { filterEventsAgainstList } from './filter_events_with_list';
import { ExceptionListItemSchema } from '../../../../../lists/common/schemas';

interface SearchAfterAndBulkCreateParams {
  gap: moment.Duration | null;
  previousStartedAt: Date | null | undefined;
  ruleParams: RuleTypeParams;
  services: AlertServices;
  listClient: ListClient | undefined; // TODO: undefined is for temporary development, remove before merged
  exceptionsList: ExceptionListItemSchema[];
  logger: Logger;
  id: string;
  inputIndexPattern: string[];
  signalsIndex: string;
  name: string;
  actions: RuleAlertAction[];
  createdAt: string;
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
  interval: string;
  enabled: boolean;
  pageSize: number;
  filter: unknown;
  refresh: RefreshTypes;
  tags: string[];
  throttle: string;
}

export interface SearchAfterAndBulkCreateReturnType {
  success: boolean;
  searchAfterTimes: string[];
  bulkCreateTimes: string[];
  lastLookBackDate: Date | null | undefined;
  createdSignalsCount: number;
}

// search_after through documents and re-index using bulk endpoint.
export const searchAfterAndBulkCreate = async ({
  gap,
  previousStartedAt,
  ruleParams,
  exceptionsList,
  services,
  listClient,
  logger,
  id,
  inputIndexPattern,
  signalsIndex,
  filter,
  actions,
  name,
  createdAt,
  createdBy,
  updatedBy,
  updatedAt,
  interval,
  enabled,
  pageSize,
  refresh,
  tags,
  throttle,
}: SearchAfterAndBulkCreateParams): Promise<SearchAfterAndBulkCreateReturnType> => {
  const toReturn: SearchAfterAndBulkCreateReturnType = {
    success: false,
    searchAfterTimes: [],
    bulkCreateTimes: [],
    lastLookBackDate: null,
    createdSignalsCount: 0,
  };

  let sortId; // tells us where to start our next search_after query
  let searchResultSize = 0;

  /*

  from: 'now'
  to: 'now-6m'
  gap: 3m
  from: 'now'
  to: 'now-9m'


  gap 3m
  from: 'now'
  to: 'now-6m'

  from'now-6m'
  to: '6m-9m'


    The purpose of `maxResults` is to ensure we do not perform
    extra search_after's. This will be reset on each
    iteration, although it really only matters for the first
    iteration of the loop.
    e.g. if maxSignals = 100 but our search result only yields
    27 documents, there is no point in performing another search
    since we know there are no more events that match our rule,
    and thus, no more signals we could possibly generate.
    However, if maxSignals = 500 and our search yields a total
    of 3050 results we don't want to make 3050 signals,
    we only want 500. So maxResults will help us control how
    many times we perform a search_after
  */
  let maxResults = ruleParams.maxSignals;

  type unitType = 's' | 'm' | 'h';
  const isValidUnit = (unit: string): unit is unitType => ['s', 'm', 'h'].includes(unit);
  // add a 'gap' parameter that would add the
  // 'from' with the 'gap' - need to figure out
  // how to do datemath with moment.
  let calculatedFrom = ruleParams.from;
  const totalToFromTuples = [];
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
      // cosnt newFrom = moment.duration(300, 's');
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
        let tempFrom;
        let tempTo = calculatedFromAsMoment;
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
        while (totalToFromTuples.length < maxCatchup) {
          if (maxCatchup > 0 && maxCatchup < 1) {
            totalToFromTuples.push({
              to: moment(tempTo),
              from: moment(tempTo?.add(gapDiffInUnits, momentUnit)),
            });
            break;
          }
          logger.debug(`tempTo: ${tempTo?.toISOString()}`);
          const beforeMutatedTo = moment(tempTo); // make a new moment
          const beforeMutatedFrom = moment(tempTo?.subtract(intervalMoment, momentUnit));
          const tuple = {
            to: beforeMutatedTo,
            from: beforeMutatedFrom,
          };
          logger.debug(`tuple: ${JSON.stringify(tuple, null, 4)}`);
          totalToFromTuples.push(tuple);
          tempTo = beforeMutatedFrom;
        }
        totalToFromTuples.push({
          to: dateMath.parse(ruleParams.to),
          from: dateMath.parse(ruleParams.from),
        });

        // create a new max results which in the above example equates to
        // 20 signals as the MAX_SIGNALS for the gap duration + our normal MAX_SIGNALS defaulted to 100
        // which comes out to 120 total max signals.
        maxResults = Math.round(maxCatchup * ruleParams.maxSignals) + ruleParams.maxSignals;
        logger.debug(`new maxResults: ${maxResults}`);
      }
    }
  } else {
    totalToFromTuples.push({
      to: moment(ruleParams.to),
      from: moment(ruleParams.from),
    });
  }

  // I think we can remove this maxResults thing and just iterate over the tuples
  // which will clean things up nicely.
  // while (searchResultSize < maxResults) {
  logger.debug(`totalToFromTuples.length: ${totalToFromTuples.length}`);
  // totalToFromTuples.reverse();
  logger.debug(`${JSON.stringify(totalToFromTuples, null, 4)}`);
  const useSortIds = totalToFromTuples.length <= 1;
  while (totalToFromTuples.length > 0) {
    // await totalToFromTuples.forEach(async (tuple) => {
    const tuple = totalToFromTuples.pop();
    try {
      // @ts-ignore
      logger.debug(`sortIds: ${sortId}`);
      const {
        // @ts-ignore https://github.com/microsoft/TypeScript/issues/35546
        searchResult,
        searchDuration,
      }: { searchResult: SignalSearchResponse; searchDuration: string } = await singleSearchAfter({
        // @ts-ignore we are using sortId before being assigned but that's ok.
        searchAfterSortId: useSortIds ? sortId : undefined,
        index: inputIndexPattern,
        // from: calculatedFrom,
        from: tuple!.from!.toISOString(), // TODO: bang
        // to: ruleParams.to,
        to: tuple!.to!.toISOString(), // TODO: bang
        services,
        logger,
        filter,
        pageSize, // maximum number of docs to receive per search result.
      });
      toReturn.searchAfterTimes.push(searchDuration);
      toReturn.lastLookBackDate =
        searchResult.hits.hits.length > 0
          ? new Date(
              searchResult.hits.hits[searchResult.hits.hits.length - 1]?._source['@timestamp']
            )
          : null;
      const totalHits =
        typeof searchResult.hits.total === 'number'
          ? searchResult.hits.total
          : searchResult.hits.total.value;
      logger.debug(`totalHits: ${totalHits}`);
      logger.debug(`searchResult.hit.hits.length: ${searchResult.hits.hits.length}`);

      // re-calculate maxResults to ensure if our search results
      // are less than max signals, we are not attempting to
      // create more signals than there are total search results.
      maxResults = Math.min(totalHits, ruleParams.maxSignals);
      searchResultSize += searchResult.hits.hits.length;
      // if (searchResult.hits.hits.length === 0) {
      //   toReturn.success = true;
      //   return toReturn;
      // }

      // filter out the search results that match with the values found in the list.
      // the resulting set are valid signals that are not on the allowlist.
      const filteredEvents: SignalSearchResponse =
        listClient != null
          ? await filterEventsAgainstList({
              listClient,
              exceptionsList,
              logger,
              eventSearchResult: searchResult,
            })
          : searchResult;

      if (filteredEvents.hits.total === 0 || filteredEvents.hits.hits.length === 0) {
        // everything in the events were allowed, so no need to generate signals
        toReturn.success = true;
        return toReturn;
      }

      // cap max signals created to be no more than maxSignals
      // if (toReturn.createdSignalsCount + filteredEvents.hits.hits.length > ruleParams.maxSignals) {
      //   const tempSignalsToIndex = filteredEvents.hits.hits.slice(
      //     0,
      //     ruleParams.maxSignals - toReturn.createdSignalsCount
      //   );
      //   filteredEvents.hits.hits = tempSignalsToIndex;
      // }
      logger.debug('next bulk index');
      const {
        bulkCreateDuration: bulkDuration,
        createdItemsCount: createdCount,
      } = await singleBulkCreate({
        filteredEvents,
        ruleParams,
        services,
        logger,
        id,
        signalsIndex,
        actions,
        name,
        createdAt,
        createdBy,
        updatedAt,
        updatedBy,
        interval,
        enabled,
        refresh,
        tags,
        throttle,
      });
      logger.debug('finished next bulk index');
      logger.debug(`created ${createdCount} signals`);
      toReturn.createdSignalsCount += createdCount;
      if (bulkDuration) {
        toReturn.bulkCreateTimes.push(bulkDuration);
      }

      logger.debug(`filteredEvents.hits.hits: ${filteredEvents.hits.hits.length}`);
      if (useSortIds && filteredEvents.hits.hits[0].sort == null) {
        logger.debug('sortIds was empty on search');
        toReturn.success = true;
        return toReturn; // no more search results
      } else if (
        useSortIds &&
        filteredEvents.hits.hits !== null &&
        filteredEvents.hits.hits[0].sort !== null
      ) {
        sortId = filteredEvents.hits.hits[0].sort ? filteredEvents.hits.hits[0].sort[0] : undefined;
      }
    } catch (exc) {
      logger.error(`[-] search_after and bulk threw an error ${exc}`);
      toReturn.success = false;
      return toReturn;
    }
  }
  logger.debug(`[+] completed bulk index of ${toReturn.createdSignalsCount}`);
  toReturn.success = true;
  return toReturn;
};
