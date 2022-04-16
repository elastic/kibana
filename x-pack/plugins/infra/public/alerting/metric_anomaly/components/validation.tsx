/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';

export function validateMetricAnomaly({
  hasInfraMLCapabilities,
}: {
  hasInfraMLCapabilities: boolean;
}): ValidationResult {
  const validationResult = { errors: {} };
  const errors: {
    hasInfraMLCapabilities: string[];
  } = {
    hasInfraMLCapabilities: [],
  };

  validationResult.errors = errors;

  if (!hasInfraMLCapabilities) {
    errors.hasInfraMLCapabilities.push(
      i18n.translate('xpack.infra.metrics.alertFlyout.error.mlCapabilitiesRequired', {
        defaultMessage: 'Cannot create an anomaly alert when machine learning is disabled.',
      })
    );
  }

  return validationResult;
}
