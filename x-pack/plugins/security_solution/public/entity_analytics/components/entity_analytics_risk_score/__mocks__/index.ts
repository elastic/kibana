/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskSeverity } from '../../../../../common/search_strategy/security_solution';

export const mockSeverityCount = {
  [RiskSeverity.unknown]: 1,
  [RiskSeverity.low]: 2,
  [RiskSeverity.moderate]: 3,
  [RiskSeverity.high]: 4,
  [RiskSeverity.critical]: 5,
};
