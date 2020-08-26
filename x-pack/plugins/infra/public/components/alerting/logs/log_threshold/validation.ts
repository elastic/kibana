/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ValidationResult } from '../../../../../../triggers_actions_ui/public/types';
import { AlertParams } from '../../../../../common/alerting/logs/log_threshold/types';

export function validateExpression({
  threshold,
  criteria,
  timeSize,
  timeUnit,
}: Partial<AlertParams>): ValidationResult {
  const validationResult = { errors: {} };

  // NOTE: In the case of components provided by the Alerting framework the error property names
  // must match what they expect.
  const errors: {
    threshold: {
      value: string[];
    };
    criteria: {
      [id: string]: {
        field: string[];
        comparator: string[];
        value: string[];
      };
    };
    timeWindowSize: string[];
    timeSizeUnit: string[];
  } = {
    threshold: {
      value: [],
    },
    criteria: {},
    timeSizeUnit: [],
    timeWindowSize: [],
  };

  validationResult.errors = errors;

  // Threshold validation
  if (typeof threshold?.value !== 'number') {
    errors.threshold.value.push(
      i18n.translate('xpack.infra.logs.alertFlyout.error.thresholdRequired', {
        defaultMessage: 'Threshold value is Required.',
      })
    );
  }

  // Time validation
  if (!timeSize) {
    errors.timeWindowSize.push(
      i18n.translate('xpack.infra.logs.alertFlyout.error.timeSizeRequired', {
        defaultMessage: 'Time size is Required.',
      })
    );
  }

  if (criteria && criteria.length > 0) {
    // Criteria validation
    criteria.forEach((criterion, idx: number) => {
      const id = idx.toString();

      errors.criteria[id] = {
        field: [],
        comparator: [],
        value: [],
      };

      if (!criterion.field) {
        errors.criteria[id].field.push(
          i18n.translate('xpack.infra.logs.alertFlyout.error.criterionFieldRequired', {
            defaultMessage: 'Field is required.',
          })
        );
      }

      if (!criterion.comparator) {
        errors.criteria[id].comparator.push(
          i18n.translate('xpack.infra.logs.alertFlyout.error.criterionComparatorRequired', {
            defaultMessage: 'Comparator is required.',
          })
        );
      }

      if (!criterion.value) {
        errors.criteria[id].value.push(
          i18n.translate('xpack.infra.logs.alertFlyout.error.criterionValueRequired', {
            defaultMessage: 'Value is required.',
          })
        );
      }
    });
  }

  return validationResult;
}
