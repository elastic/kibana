/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { formatNumber } from './number';
export const formatPercent = (val: number) => {
  return `${formatNumber(val * 100)}%`;
};
