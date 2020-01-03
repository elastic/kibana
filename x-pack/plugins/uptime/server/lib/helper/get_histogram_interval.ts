/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import DateMath from '@elastic/datemath';
import { QUERY } from '../../../../../legacy/plugins/uptime/common/constants';

export const getHistogramInterval = (
  dateRangeStart: string,
  dateRangeEnd: string,
  bucketCount?: number
): number => {
  const from = DateMath.parse(dateRangeStart);
  const to = DateMath.parse(dateRangeEnd);
  if (from === undefined) {
    throw Error('Invalid dateRangeStart value');
  }
  if (to === undefined) {
    throw Error('Invalid dateRangeEnd value');
  }
  return Math.round((to.valueOf() - from.valueOf()) / (bucketCount || QUERY.DEFAULT_BUCKET_COUNT));
};
