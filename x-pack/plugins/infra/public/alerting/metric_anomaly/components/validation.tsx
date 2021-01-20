/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ValidationResult } from '../../../../../triggers_actions_ui/public/types';

export function validateMetricAnomaly(): ValidationResult {
  const validationResult = { errors: {} };
  const errors: {
    [id: string]: {};
  } = {};
  // The metric anomaly form doesn't use any fields that are capable of containing empty or invalid results,
  // so this validator is a no-op

  validationResult.errors = errors;

  return validationResult;
}
