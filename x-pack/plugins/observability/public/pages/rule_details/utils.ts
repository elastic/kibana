/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { formatDurationFromTimeUnitChar, TimeUnitChar } from '../../../common';

export const formatInterval = (ruleInterval: string) => {
  const interval: string[] | null = ruleInterval.match(/(^\d*)([s|m|h|d])/);
  if (!interval || interval.length < 3) return ruleInterval;
  const value: number = +interval[1];
  const unit = interval[2] as TimeUnitChar;
  return formatDurationFromTimeUnitChar(value, unit);
};
