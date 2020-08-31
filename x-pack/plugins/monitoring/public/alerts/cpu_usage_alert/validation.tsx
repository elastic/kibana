/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ValidationResult } from '../../../../triggers_actions_ui/public/types';

export function validate(opts: any): ValidationResult {
  const validationResult = { errors: {} };

  const errors: { [key: string]: string[] } = {
    duration: [],
    threshold: [],
  };
  if (!opts.duration) {
    errors.duration.push(
      i18n.translate('xpack.monitoring.alerts.cpuUsage.validation.duration', {
        defaultMessage: 'A valid duration is required.',
      })
    );
  }
  if (isNaN(opts.threshold)) {
    errors.threshold.push(
      i18n.translate('xpack.monitoring.alerts.cpuUsage.validation.threshold', {
        defaultMessage: 'A valid number is required.',
      })
    );
  }

  validationResult.errors = errors;
  return validationResult;
}
