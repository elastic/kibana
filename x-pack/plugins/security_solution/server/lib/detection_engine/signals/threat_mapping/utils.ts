/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import type { ThreatMapping } from '@kbn/securitysolution-io-ts-alerting-types';
import { get } from 'lodash';
import type { SearchAfterAndBulkCreateReturnType, SignalSourceHit } from '../types';
import { parseInterval } from '../utils';
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
  hit.matched_queries?.map((match) => decodeThreatMatchNamedQuery(match)) ?? [];

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
      acc[field][fieldValue].push(event._id);
    });
    return acc;
  }, {});
