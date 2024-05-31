/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';
import { BurnRateRuleParams, Duration } from '../../typings';

export interface WindowResult {
  longWindow: string[];
  burnRateThreshold: string[];
}

export type ValidationBurnRateRuleResult = ValidationResult & {
  errors: {
    sloId: string[];
    windows: WindowResult[];
  };
};

const MIN_DURATION_IN_HOURS = 1;
const MAX_DURATION_IN_HOURS = 72;

type Optional<T> = { [P in keyof T]?: T[P] };

export function validateBurnRateRule(
  ruleParams: Optional<BurnRateRuleParams>
): ValidationBurnRateRuleResult {
  const validationResult: ValidationBurnRateRuleResult = {
    errors: {
      sloId: new Array<string>(),
      windows: new Array<WindowResult>(),
    },
  };
  const { sloId, windows } = ruleParams;

  if (!sloId) {
    validationResult.errors.sloId.push(SLO_REQUIRED);
  }

  if (windows) {
    windows.forEach(({ burnRateThreshold, longWindow, maxBurnRateThreshold }) => {
      const result = { longWindow: new Array<string>(), burnRateThreshold: new Array<string>() };
      if (burnRateThreshold === undefined || maxBurnRateThreshold === undefined) {
        result.burnRateThreshold.push(BURN_RATE_THRESHOLD_REQUIRED);
      } else if (sloId && (burnRateThreshold < 0.01 || burnRateThreshold > maxBurnRateThreshold)) {
        result.burnRateThreshold.push(getInvalidThresholdValueError(maxBurnRateThreshold));
      }
      if (longWindow === undefined) {
        result.longWindow.push(LONG_WINDOW_DURATION_REQUIRED);
      } else if (!isValidLongWindowDuration(longWindow)) {
        result.longWindow.push(LONG_WINDOW_DURATION_INVALID);
      }
      validationResult.errors.windows.push(result);
    });
  }

  return validationResult;
}

const isValidLongWindowDuration = (duration: Duration): boolean => {
  const { unit, value } = duration;
  return unit === 'h' && value >= MIN_DURATION_IN_HOURS && value <= MAX_DURATION_IN_HOURS;
};

const SLO_REQUIRED = i18n.translate('xpack.slo.rules.burnRate.errors.sloRequired', {
  defaultMessage: 'SLO is required.',
});

const LONG_WINDOW_DURATION_REQUIRED = i18n.translate(
  'xpack.slo.rules.burnRate.errors.windowDurationRequired',
  { defaultMessage: 'The lookback period is required.' }
);

const LONG_WINDOW_DURATION_INVALID = i18n.translate('xpack.slo.rules.longWindow.errorText', {
  defaultMessage: 'The lookback period must be between 1 and 72 hours.',
});

const BURN_RATE_THRESHOLD_REQUIRED = i18n.translate(
  'xpack.slo.rules.burnRate.errors.burnRateThresholdRequired',
  { defaultMessage: 'Burn rate threshold is required.' }
);

const getInvalidThresholdValueError = (maxBurnRate: number) =>
  i18n.translate('xpack.slo.rules.burnRate.errors.invalidThresholdValue', {
    defaultMessage: 'Burn rate threshold must be between 0.01 and {maxBurnRate}.',
    values: { maxBurnRate },
  });
