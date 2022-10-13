/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformHealthRuleTestsConfig } from '../types/alerting';

export function getResultTestConfig(config: TransformHealthRuleTestsConfig) {
  return {
    notStarted: {
      enabled: config?.notStarted?.enabled ?? true,
    },
    errorMessages: {
      enabled: config?.errorMessages?.enabled ?? true,
    },
  };
}
