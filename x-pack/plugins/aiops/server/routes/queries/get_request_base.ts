/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiopsLogRateAnalysisSchema } from '../../../common/api/log_rate_analysis';

export const getRequestBase = ({ index, includeFrozen }: AiopsLogRateAnalysisSchema) => ({
  index,
  ...(includeFrozen ? { ignore_throttled: false } : {}),
  ignore_unavailable: true,
});
