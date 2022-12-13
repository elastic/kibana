/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';
import { BurnRateRuleParams, DurationUnit } from '../../../typings';

export type ValidationBurnRateRuleResult = ValidationResult & {
  errors: Record<keyof BurnRateRuleParams, string[]>;
};

const MIN_DURATION_IN_MINUTES = 30;
const MAX_DURATION_IN_MINUTES = 1440;
const MAX_DURATION_IN_HOURS = 24;

export function validateBurnRateRule(ruleParams: BurnRateRuleParams): ValidationBurnRateRuleResult {
  const validationResult: ValidationBurnRateRuleResult = {
    errors: {
      sloId: new Array<string>(),
      longWindow: new Array<string>(),
      burnRateThreshold: new Array<string>(),
    },
  };
  const { sloId, burnRateThreshold, maxBurnRateThreshold, longWindow } = ruleParams;

  if (!sloId) {
    validationResult.errors.sloId.push(SLO_REQUIRED);
  }

  if (burnRateThreshold < 1 || burnRateThreshold > maxBurnRateThreshold) {
    validationResult.errors.burnRateThreshold.push(
      getInvalidThresholdValueError(maxBurnRateThreshold)
    );
  }

  if (longWindow === undefined) {
    validationResult.errors.longWindow.push(LONG_WINDOW_DURATION_REQUIRED);
  } else if (!isValidLongWindowDuration(longWindow.value, longWindow.unit)) {
    validationResult.errors.longWindow.push(LONG_WINDOW_DURATION_INVALID);
  }

  return validationResult;
}

const isValidLongWindowDuration = (value: number, unit: DurationUnit): boolean => {
  return (
    (unit === 'm' && value >= MIN_DURATION_IN_MINUTES && value <= MAX_DURATION_IN_MINUTES) ||
    (unit === 'h' && value <= MAX_DURATION_IN_HOURS)
  );
};

const SLO_REQUIRED = i18n.translate('xpack.observability.slo.rules.burnRate.errors.sloRequired', {
  defaultMessage: 'SLO is required.',
});

const LONG_WINDOW_DURATION_REQUIRED = i18n.translate(
  'xpack.observability.slo.rules.burnRate.errors.windowDurationRequired',
  { defaultMessage: 'Long window duration is required.' }
);

const LONG_WINDOW_DURATION_INVALID = i18n.translate(
  'xpack.observability.slo.rules.longWindow.errorText',
  {
    defaultMessage: 'The long window must be between 30 minutes and 24 hours or 1440 minutes.',
  }
);

const getInvalidThresholdValueError = (maxBurnRate: number) =>
  i18n.translate('xpack.observability.slo.rules.burnRate.errors.invalidThresholdValue', {
    defaultMessage: 'Burn rate threshold must be between 1 and {maxBurnRate}.',
    values: { maxBurnRate },
  });
