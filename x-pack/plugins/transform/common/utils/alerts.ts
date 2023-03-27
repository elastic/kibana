/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformHealthRuleTestsConfig } from '../types/alerting';

export function getResultTestConfig(config: TransformHealthRuleTestsConfig) {
  let healthCheckEnabled = true;

  if (typeof config?.healthCheck?.enabled === 'boolean') {
    healthCheckEnabled = config?.healthCheck?.enabled;
  } else if (typeof config?.errorMessages?.enabled === 'boolean') {
    // if errorMessages test has been explicitly enabled / disabled,
    // also disabled the healthCheck test
    healthCheckEnabled = false;
  }

  return {
    notStarted: {
      enabled: config?.notStarted?.enabled ?? true,
    },
    errorMessages: {
      enabled: config?.errorMessages?.enabled ?? false,
    },
    healthCheck: {
      enabled: healthCheckEnabled,
    },
  };
}
