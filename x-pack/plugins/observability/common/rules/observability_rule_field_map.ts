/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ecsFieldMap, pickWithPatterns } from '../../../rule_registry/common';

export const observabilityRuleFieldMap = {
  ...pickWithPatterns(ecsFieldMap, 'host.name', 'service.name'),
  'kibana.observability.evaluation.value': {
    type: 'scaled_float' as const,
    scaling_factor: 1000,
  },
  'kibana.observability.evaluation.threshold': {
    type: 'scaled_float' as const,
    scaling_factor: 1000,
  },
};

export type ObservabilityRuleFieldMap = typeof observabilityRuleFieldMap;
