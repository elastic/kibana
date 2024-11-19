/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import * as rt from 'io-ts';
import { isNumber, isFinite } from 'lodash';
import { IErrorObject, ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';
import {
  PartialCountCriteria,
  isRatioRule,
  getNumerator,
  getDenominator,
  PartialRequiredRuleParams,
  PartialCriteria,
} from '../../../common/alerting/logs/log_threshold/types';

export const criterionErrorRT = rt.type({
  field: rt.array(rt.string),
  comparator: rt.array(rt.string),
  value: rt.array(rt.string),
});

export const criterionErrorsRT = rt.record(rt.string, criterionErrorRT);

export type CriterionErrors = rt.TypeOf<typeof criterionErrorsRT>;

const alertingErrorRT: rt.Type<IErrorObject> = rt.recursion('AlertingError', () =>
  rt.record(rt.string, rt.union([rt.string, rt.array(rt.string), alertingErrorRT]))
);

export const errorsRT = rt.type({
  threshold: rt.type({
    value: rt.array(rt.string),
  }),
  // NOTE: The data structure for criteria errors isn't 100%
  // ideal but we need to conform to the interfaces that the alerting
  // framework expects.
  criteria: rt.record(rt.string, criterionErrorsRT),
  timeWindowSize: rt.array(rt.string),
  timeSizeUnit: rt.array(rt.string),
});

export type Errors = rt.TypeOf<typeof errorsRT>;

export function validateExpression({
  count,
  criteria,
  timeSize,
}: PartialRequiredRuleParams & {
  criteria: PartialCriteria;
}): ValidationResult {
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
    const getCriterionErrors = (_criteria: PartialCountCriteria): CriterionErrors => {
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

    if (!isRatioRule(criteria)) {
      const criteriaErrors = getCriterionErrors(criteria);
      errors.criteria[0] = criteriaErrors;
    } else {
      const numeratorErrors = getCriterionErrors(getNumerator(criteria));
      errors.criteria[0] = numeratorErrors;
      const denominatorErrors = getCriterionErrors(getDenominator(criteria));
      errors.criteria[1] = denominatorErrors;
    }
  }

  return validationResult;
}
