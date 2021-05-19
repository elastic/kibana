/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimefilterContract } from 'src/plugins/data/public';

export * from './get_all_index_patterns';

export const getResolvedDateRange = function (timefilter: TimefilterContract) {
  const { from, to } = timefilter.getTime();
  const { min, max } = timefilter.calculateBounds({
    from,
    to,
  });
  return { fromDate: min?.toISOString() || from, toDate: max?.toISOString() || to };
};
