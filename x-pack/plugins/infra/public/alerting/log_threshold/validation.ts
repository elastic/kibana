/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { isNumber, isFinite } from 'lodash';
import { ValidationResult } from '../../../../triggers_actions_ui/public';
import {
  AlertParams,
  Criteria,
  RatioCriteria,
  isRatioAlert,
  getNumerator,
  getDenominator,
} from '../../../common/alerting/logs/log_threshold/types';

export interface CriterionErrors {
  [id: string]: {
    field: string[];
    comparator: string[];
    value: string[];
  };
}

export interface Errors {
  threshold: {
    value: string[];
  };
  // NOTE: The data structure for criteria errors isn't 100%
  // ideal but we need to conform to the interfaces that the alerting
  // framework expects.
  criteria: {
    [id: string]: CriterionErrors;
  };
  timeWindowSize: string[];
  timeSizeUnit: string[];
}

export function validateExpression({
  count,
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
    criteria: {},
    timeSizeUnit: [],
    timeWindowSize: [],
  };

  validationResult.errors = errors;

  // Threshold validation
  if (!isNumber(count?.value) && !isFinite(count?.value)) {
    errors.threshold.value.push(
      i18n.translate('xpack.infra.logs.alertFlyout.error.thresholdRequired', {
        defaultMessage: 'Numeric threshold value is Required.',
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
    const getCriterionErrors = (_criteria: Criteria): CriterionErrors => {
      const _errors: CriterionErrors = {};

      _criteria.forEach((criterion, idx) => {
        _errors[idx] = {
          field: [],
          comparator: [],
          value: [],
        };
        if (!criterion.field) {
          _errors[idx].field.push(
            i18n.translate('xpack.infra.logs.alertFlyout.error.criterionFieldRequired', {
              defaultMessage: 'Field is required.',
            })
          );
        }
        if (!criterion.comparator) {
          _errors[idx].comparator.push(
            i18n.translate('xpack.infra.logs.alertFlyout.error.criterionComparatorRequired', {
              defaultMessage: 'Comparator is required.',
            })
          );
        }
        if (criterion.value === undefined || criterion.value === null) {
          _errors[idx].value.push(
            i18n.translate('xpack.infra.logs.alertFlyout.error.criterionValueRequired', {
              defaultMessage: 'Value is required.',
            })
          );
        }
      });
      return _errors;
    };

    if (!isRatioAlert(criteria)) {
      const criteriaErrors = getCriterionErrors(criteria as Criteria);
      errors.criteria[0] = criteriaErrors;
    } else {
      const numeratorErrors = getCriterionErrors(getNumerator(criteria as RatioCriteria));
      errors.criteria[0] = numeratorErrors;
      const denominatorErrors = getCriterionErrors(getDenominator(criteria as RatioCriteria));
      errors.criteria[1] = denominatorErrors;
    }
  }

  return validationResult;
}
