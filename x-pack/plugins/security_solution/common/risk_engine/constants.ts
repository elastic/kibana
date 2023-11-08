/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskSeverity } from '../search_strategy';

export const MAX_SPACES_COUNT = 1;

export const RISK_SCORE_RANGES = {
  [RiskSeverity.unknown]: { start: 0, stop: 20 },
  [RiskSeverity.low]: { start: 20, stop: 40 },
  [RiskSeverity.moderate]: { start: 40, stop: 70 },
  [RiskSeverity.high]: { start: 70, stop: 90 },
  [RiskSeverity.critical]: { start: 90, stop: 100 },
};
