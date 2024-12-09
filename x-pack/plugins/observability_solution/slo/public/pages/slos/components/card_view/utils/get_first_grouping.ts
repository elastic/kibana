/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';

export const getFirstGrouping = (slo: SLOWithSummaryResponse) => {
  const firstGrouping = Object.entries(slo.groupings).map(([key, value]) => `${key}: ${value}`)[0];
  return slo.groupBy && ![slo.groupBy].flat().includes(ALL_VALUE) ? firstGrouping : '';
};
