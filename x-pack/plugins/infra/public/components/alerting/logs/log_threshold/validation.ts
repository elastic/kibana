/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ValidationResult } from '../../../../../../triggers_actions_ui/public/types';
import { AlertParams, Criteria } from '../../../../../common/alerting/logs/log_threshold/types';

export interface CriterionErrors {
  field: string[];
  comparator: string[];
  value: string[];
}

export interface Errors {
  threshold: {
    value: string[];
  };
  criteria: CriterionErrors[] | [CriterionErrors[], CriterionErrors[]];
  timeWindowSize: string[];
  timeSizeUnit: string[];
}

export function validateExpression({
  threshold,
  criteria,
  timeSize,
  timeUnit,
}: Partial<AlertParams>): ValidationResult {
  const validationResult = { errors: {} };

  // NOTE: In the case of components provided by the Alerting framework the error property names
  // must match what they expect.
  const errors: Errors = {
    threshold: {
      value: [],
    },
    criteria: criteria && criteria.length > 0 && !Array.isArray(criteria[0]) ? [] : [[], []],
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

  // Criteria validation
  if (criteria && criteria.length > 0) {
    const getCriterionErrors = (_criteria: Criteria): CriterionErrors[] => {
      const criterionErrors: CriterionErrors[] = [];
      _criteria.forEach((criterion) => {
        const _errors: CriterionErrors = {
          field: [],
          comparator: [],
          value: [],
        };
        if (!criterion.field) {
          _errors.field.push(
            i18n.translate('xpack.infra.logs.alertFlyout.error.criterionFieldRequired', {
              defaultMessage: 'Field is required.',
            })
          );
        }
        if (!criterion.comparator) {
          _errors.comparator.push(
            i18n.translate('xpack.infra.logs.alertFlyout.error.criterionComparatorRequired', {
              defaultMessage: 'Comparator is required.',
            })
          );
        }
        if (!criterion.value) {
          _errors.value.push(
            i18n.translate('xpack.infra.logs.alertFlyout.error.criterionValueRequired', {
              defaultMessage: 'Value is required.',
            })
          );
        }
        criterionErrors.push(_errors);
      });
      return criterionErrors;
    };

    if (!Array.isArray(criteria[0])) {
      const criteriaErrors = getCriterionErrors(criteria as Criteria);
      errors.criteria = criteriaErrors;
    } else {
      const numeratorErrors = getCriterionErrors(criteria[0] as Criteria);
      const denominatorErrors = getCriterionErrors(criteria[1] as Criteria);
      errors.criteria = [numeratorErrors, denominatorErrors];
    }
  }

  return validationResult;
}
