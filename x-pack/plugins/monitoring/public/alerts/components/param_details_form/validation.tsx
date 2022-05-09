/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { RuleTypeParams } from '@kbn/alerting-plugin/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public/types';

export type MonitoringAlertTypeParams = ValidateOptions & RuleTypeParams;
interface ValidateOptions {
  duration: string;
  threshold: number;
}

export function validate(inputValues: ValidateOptions): ValidationResult {
  const validationResult = { errors: {} };

  const errors: { [key: string]: string[] } = {
    duration: [],
    threshold: [],
  };
  if (!inputValues.duration) {
    errors.duration.push(
      i18n.translate('xpack.monitoring.alerts.validation.duration', {
        defaultMessage: 'A valid duration is required.',
      })
    );
  }
  if (isNaN(inputValues.threshold)) {
    errors.threshold.push(
      i18n.translate('xpack.monitoring.alerts.validation.threshold', {
        defaultMessage: 'A valid number is required.',
      })
    );
  }

  validationResult.errors = errors;
  return validationResult;
}
