/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public/types';

export function validate(opts: any): ValidationResult {
  const validationResult = { errors: {} };

  const errors: { [key: string]: string[] } = {
    duration: [],
    limit: [],
  };
  if (!opts.duration) {
    errors.duration.push(
      i18n.translate('xpack.monitoring.alerts.missingData.validation.duration', {
        defaultMessage: 'A valid duration is required.',
      })
    );
  }
  if (!opts.limit) {
    errors.limit.push(
      i18n.translate('xpack.monitoring.alerts.missingData.validation.limit', {
        defaultMessage: 'A valid limit is required.',
      })
    );
  }

  validationResult.errors = errors;
  return validationResult;
}
