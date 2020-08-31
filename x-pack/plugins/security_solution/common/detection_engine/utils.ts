/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import dateMath from '@elastic/datemath';

import { EntriesArray } from '../shared_imports';
import { RuleType } from './types';

export const hasLargeValueList = (entries: EntriesArray): boolean => {
  const found = entries.filter(({ type }) => type === 'list');
  return found.length > 0;
};

export const hasNestedEntry = (entries: EntriesArray): boolean => {
  const found = entries.filter(({ type }) => type === 'nested');
  return found.length > 0;
};

export const isThresholdRule = (ruleType: RuleType) => ruleType === 'threshold';

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
