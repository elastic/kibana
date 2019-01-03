/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UTILS } from './constants';

export const getDateHistogramIntervalMillis = (
  dateRangeStartMillis: number,
  dateRangeEndMillis: number
): string => `${Math.trunc((dateRangeEndMillis - dateRangeStartMillis) / UTILS.BUCKET_SIZE)}ms`;
