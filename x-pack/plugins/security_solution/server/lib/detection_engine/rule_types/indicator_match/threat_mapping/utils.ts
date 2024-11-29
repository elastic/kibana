/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import type { ThreatMapping } from '@kbn/securitysolution-io-ts-alerting-types';
import { get, isEmpty } from 'lodash';

import { TelemetryChannel } from '../../../../telemetry/types';
import type { ITelemetryEventsSender } from '../../../../telemetry/sender';

import type { SearchAfterAndBulkCreateReturnType, SignalSourceHit } from '../../types';
import { parseInterval } from '../../utils/utils';
import { ThreatMatchQueryType } from './types';
import type {
  ThreatListItem,
  ThreatMatchedFields,
  ThreatTermNamedQuery,
  DecodedThreatNamedQuery,
  SignalValuesMap,
  GetSignalValuesMap,
  ThreatMatchNamedQuery,
} from './types';

export const MANY_NESTED_CLAUSES_ERR =
  'Query contains too many nested clauses; maxClauseCount is set to';
export const FAILED_CREATE_QUERY_MAX_CLAUSE = 'failed to create query: maxClauseCount is set to';

/**
 * Given two timers this will take the max of each and add them to each other and return that addition.
 * Max(timer_array_1) + Max(timer_array_2)
 * @param existingTimers String array of existing timers
 * @param newTimers String array of new timers.
 * @returns String array of the new maximum between the two timers
 */
export const calculateAdditiveMax = (existingTimers: string[], newTimers: string[]): string[] => {
  const numericNewTimerMax = Math.max(0, ...newTimers.map((time) => +time));
  const numericExistingTimerMax = Math.max(0, ...existingTimers.map((time) => +time));
  return [String(numericNewTimerMax + numericExistingTimerMax)];
};

/**
 * Given two timers this will take the max of each and then get the max from each.
 * Max(Max(timer_array_1), Max(timer_array_2))
 * @param existingTimers String array of existing timers
 * @param newTimers String array of new timers.
 * @returns String array of the new maximum between the two timers
 */
export const calculateMax = (existingTimers: string[], newTimers: string[]): string => {
  const numericNewTimerMax = Math.max(0, ...newTimers.map((time) => +time));
  const numericExistingTimerMax = Math.max(0, ...existingTimers.map((time) => +time));
  return String(Math.max(numericNewTimerMax, numericExistingTimerMax));
};

/**
 * Given two dates this will return the larger of the two unless one of them is null
 * or undefined. If both one or the other is null/undefined it will return the newDate.
 * If there is a mix of "undefined" and "null", this will prefer to set it to "null" as having
 * a higher value than "undefined"
 * @param existingDate The existing date which can be undefined or null or a date
 * @param newDate The new date which can be undefined or null or a date
 */
export const calculateMaxLookBack = (
  existingDate: Date | null | undefined,
  newDate: Date | null | undefined
): Date | null | undefined => {
  const newDateValue = newDate === null ? 1 : newDate === undefined ? 0 : newDate.valueOf();
  const existingDateValue =
    existingDate === null ? 1 : existingDate === undefined ? 0 : existingDate.valueOf();
  if (newDateValue >= existingDateValue) {
    return newDate;
  } else {
    return existingDate;
  }
};

/**
 * Combines two results together and returns the results combined
 * @param currentResult The current result to combine with a newResult
 * @param newResult The new result to combine
 */
export const combineResults = (
  currentResult: SearchAfterAndBulkCreateReturnType,
  newResult: SearchAfterAndBulkCreateReturnType
): SearchAfterAndBulkCreateReturnType => ({
  success: currentResult.success === false ? false : newResult.success,
  warning: currentResult.warning || newResult.warning,
  enrichmentTimes: calculateAdditiveMax(currentResult.enrichmentTimes, newResult.enrichmentTimes),
  bulkCreateTimes: calculateAdditiveMax(currentResult.bulkCreateTimes, newResult.bulkCreateTimes),
  searchAfterTimes: calculateAdditiveMax(
    currentResult.searchAfterTimes,
    newResult.searchAfterTimes
  ),
  lastLookBackDate: newResult.lastLookBackDate,
  createdSignalsCount: currentResult.createdSignalsCount + newResult.createdSignalsCount,
  createdSignals: [...currentResult.createdSignals, ...newResult.createdSignals],
  warningMessages: [...currentResult.warningMessages, ...newResult.warningMessages],
  errors: [...new Set([...currentResult.errors, ...newResult.errors])],
  suppressedAlertsCount:
    (currentResult.suppressedAlertsCount ?? 0) + (newResult.suppressedAlertsCount ?? 0),
});

/**
 * Combines two results together and returns the results combined
 * @param currentResult The current result to combine with a newResult
 * @param newResult The new result to combine
 */
export const combineConcurrentResults = (
  currentResult: SearchAfterAndBulkCreateReturnType,
  newResult: SearchAfterAndBulkCreateReturnType[]
): SearchAfterAndBulkCreateReturnType => {
  const maxedNewResult = newResult.reduce(
    (accum, item) => {
      const maxSearchAfterTime = calculateMax(accum.searchAfterTimes, item.searchAfterTimes);
      const maxEnrichmentTimes = calculateMax(accum.enrichmentTimes, item.enrichmentTimes);
      const maxBulkCreateTimes = calculateMax(accum.bulkCreateTimes, item.bulkCreateTimes);
      const lastLookBackDate = calculateMaxLookBack(accum.lastLookBackDate, item.lastLookBackDate);
      return {
        success: accum.success && item.success,
        warning: accum.warning || item.warning,
        searchAfterTimes: [maxSearchAfterTime],
        bulkCreateTimes: [maxBulkCreateTimes],
        enrichmentTimes: [maxEnrichmentTimes],
        lastLookBackDate,
        createdSignalsCount: accum.createdSignalsCount + item.createdSignalsCount,
        createdSignals: [...accum.createdSignals, ...item.createdSignals],
        warningMessages: [...accum.warningMessages, ...item.warningMessages],
        errors: [...new Set([...accum.errors, ...item.errors])],
        suppressedAlertsCount:
          (accum.suppressedAlertsCount ?? 0) + (item.suppressedAlertsCount ?? 0),
      };
    },
    {
      success: true,
      warning: false,
      searchAfterTimes: [],
      bulkCreateTimes: [],
      enrichmentTimes: [],
      lastLookBackDate: undefined,
      createdSignalsCount: 0,
      suppressedAlertsCount: 0,
      createdSignals: [],
      errors: [],
      warningMessages: [],
    }
  );

  return combineResults(currentResult, maxedNewResult);
};

const separator = '__SEP__';
export const encodeThreatMatchNamedQuery = (
  query: ThreatMatchNamedQuery | ThreatTermNamedQuery
): string => {
  const { field, value, queryType } = query;
  let id;
  let index;
  if ('id' in query) {
    id = query.id;
    index = query.index;
  }

  return [id, index, field, value, queryType].join(separator);
};

export const decodeThreatMatchNamedQuery = (encoded: string): DecodedThreatNamedQuery => {
  const queryValues = encoded.split(separator);
  const [id, index, field, value, queryType] = queryValues;
  const query = { id, index, field, value, queryType };
  let isValidQuery = false;
  if (queryType === ThreatMatchQueryType.match) {
    isValidQuery = queryValues.length === 5 && queryValues.every(Boolean);
  }
  if (queryType === ThreatMatchQueryType.term) {
    isValidQuery = Boolean(field && value);
  }
  if (!isValidQuery) {
    const queryString = JSON.stringify(query);
    throw new Error(`Decoded query is invalid. Decoded value: ${queryString}`);
  }

  return query;
};

export const extractNamedQueries = (
  hit: SignalSourceHit | ThreatListItem
): DecodedThreatNamedQuery[] =>
  Array.isArray(hit.matched_queries)
    ? hit.matched_queries.map((match) => decodeThreatMatchNamedQuery(match))
    : [];

export const buildExecutionIntervalValidator: (interval: string) => () => void = (interval) => {
  const intervalDuration = parseInterval(interval);

  if (intervalDuration == null) {
    throw new Error(
      `Unable to parse rule interval (${interval}); stopping rule execution since allotted duration is undefined.`
    );
  }

  const executionEnd = moment().add(intervalDuration);
  return () => {
    if (moment().isAfter(executionEnd)) {
      const message = `Current rule execution has exceeded its allotted interval (${interval}) and has been stopped.`;
      throw new Error(message);
    }
  };
};

/*
 * Return list of fields by type used for matching in IM rule
 */
export const getMatchedFields = (threatMapping: ThreatMapping): ThreatMatchedFields =>
  threatMapping.reduce(
    (acc: ThreatMatchedFields, val) => {
      val.entries.forEach((mapping) => {
        if (!acc.source.includes(mapping.field)) {
          acc.source.push(mapping.field);
        }
        if (!acc.threat.includes(mapping.value)) {
          acc.threat.push(mapping.value);
        }
      });
      return acc;
    },
    { source: [], threat: [] }
  );

export const getSignalValueMap = ({
  eventList,
  threatMatchedFields,
}: GetSignalValuesMap): SignalValuesMap =>
  eventList.reduce<SignalValuesMap>((acc, event) => {
    threatMatchedFields.source.forEach((field) => {
      const fieldValue = get(event.fields, field)?.[0];
      if (!fieldValue) return;

      if (!acc[field]) {
        acc[field] = {};
      }
      if (!acc[field][fieldValue]) {
        acc[field][fieldValue] = [];
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      acc[field][fieldValue].push(event._id!);
    });
    return acc;
  }, {});

export const getMaxClauseCountErrorValue = (
  searchesPerformed: SearchAfterAndBulkCreateReturnType[],
  threatEntriesCount: number,
  previousChunkSize: number,
  eventsTelemetry: ITelemetryEventsSender | undefined
) =>
  searchesPerformed.reduce<{
    maxClauseCountValue: number;
    errorType: string;
  }>(
    (acc, search) => {
      const failedToCreateQueryMessage: string | undefined = search.errors.find((err) =>
        err.includes(FAILED_CREATE_QUERY_MAX_CLAUSE)
      );

      // the below error is specific to an error returned by getSignalsQueryMapFromThreatIndex
      const tooManyNestedClausesMessage: string | undefined = search.errors.find((err) =>
        err.includes(MANY_NESTED_CLAUSES_ERR)
      );

      const regex = /[0-9]+/g;
      const foundMaxClauseCountValue = failedToCreateQueryMessage?.match(regex)?.[0];
      const foundNestedClauseCountValue = tooManyNestedClausesMessage?.match(regex)?.[0];

      if (foundNestedClauseCountValue != null && !isEmpty(foundNestedClauseCountValue)) {
        const errorType = `${MANY_NESTED_CLAUSES_ERR} ${foundNestedClauseCountValue}`;
        const tempVal = parseInt(foundNestedClauseCountValue, 10);
        eventsTelemetry?.sendAsync(TelemetryChannel.DETECTION_ALERTS, [
          `Query contains too many nested clauses error received during IM search`,
        ]);

        // minus 1 since the max clause count value is exclusive
        // multiplying by two because we need to account for the
        // threat fields and event fields. A single threat entries count
        // is comprised of two fields, one field from the threat index
        // and another field from the event index. so we need to multiply by 2
        // to cover the fact that the nested clause error happens
        // because we are searching over event and threat fields.
        // so we need to make this smaller than a single 'failed to create query'
        // max clause count error.
        const val = Math.floor((tempVal - 1) / (2 * (threatEntriesCount + 1)));
        // There is a chance the new calculated val still may yield a too many nested queries
        // error message. In that case we want to make sure we don't fall into an infinite loop
        // and so we send a new value that is guaranteed to be smaller than the previous one.
        if (val >= previousChunkSize) {
          return {
            maxClauseCountValue: Math.floor(previousChunkSize / 2),
            errorType,
          };
        }
        return { maxClauseCountValue: val, errorType };
      } else if (foundMaxClauseCountValue != null && !isEmpty(foundMaxClauseCountValue)) {
        const errorType = `${FAILED_CREATE_QUERY_MAX_CLAUSE} ${foundNestedClauseCountValue}`;
        const tempVal = parseInt(foundMaxClauseCountValue, 10);
        eventsTelemetry?.sendAsync(TelemetryChannel.DETECTION_ALERTS, [
          `failed to create query error received during IM search`,
        ]);
        // minus 1 since the max clause count value is exclusive
        // and we add 1 to threatEntries to increase the number of "buckets"
        // that our searches are spread over, smaller buckets means less clauses
        const val = Math.floor((tempVal - 1) / (threatEntriesCount + 1));
        return {
          maxClauseCountValue: val,
          errorType,
        };
      } else {
        return acc;
      }
    },
    {
      maxClauseCountValue: Number.NEGATIVE_INFINITY,
      errorType: 'no helpful error message available',
    }
  );
