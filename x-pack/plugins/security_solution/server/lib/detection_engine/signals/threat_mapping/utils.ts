/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Type } from '../../../../../common/detection_engine/schemas/common/schemas';
import { SearchAfterAndBulkCreateReturnType } from '../search_after_bulk_create';

export const isThreatMatchRule = (ruleType: Type) => ruleType === 'threat_match';

/**
 * Given two timers this will take the max of each and add them to each other and return that addition.
 * Max(timer_array_1) + Max(timer_array_2)
 * @param existingTimers String array of existing timers
 * @param newTimers String array of new timers.
 * @returns String of the new maximum between the two timers
 */
export const calculateAdditiveMax = (existingTimers: string[], newTimers: string[]): string[] => {
  const numericNewTimerMax = Math.max(0, ...newTimers.map((time) => +time));
  const numericExistingTimerMax = Math.max(0, ...existingTimers.map((time) => +time));
  return [String(numericNewTimerMax + numericExistingTimerMax)];
};

export const combineResults = (
  currentResult: SearchAfterAndBulkCreateReturnType,
  newResult: SearchAfterAndBulkCreateReturnType
): SearchAfterAndBulkCreateReturnType => ({
  success: currentResult.success === false ? false : newResult.success,
  bulkCreateTimes: calculateAdditiveMax(currentResult.bulkCreateTimes, newResult.bulkCreateTimes),
  searchAfterTimes: calculateAdditiveMax(
    currentResult.searchAfterTimes,
    newResult.searchAfterTimes
  ),
  lastLookBackDate: newResult.lastLookBackDate,
  createdSignalsCount: currentResult.createdSignalsCount + newResult.createdSignalsCount,
});
