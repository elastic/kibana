/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const MANUAL_RULE_RUN_TIME_RANGE_TITLE = i18n.translate(
  'xpack.securitySolution.manuelRuleRun.timeRangeTitle',
  {
    defaultMessage: 'Select timerange for manual rule run',
  }
);

export const MANUAL_RULE_RUN_START_AT_TITLE = i18n.translate(
  'xpack.securitySolution.manuelRuleRun.startAtTitle',
  {
    defaultMessage: 'Start at',
  }
);

export const MANUAL_RULE_RUN_END_AT_TITLE = i18n.translate(
  'xpack.securitySolution.manuelRuleRun.endAtTitle',
  {
    defaultMessage: 'Finish at',
  }
);

export const MANUAL_RULE_RUN_CONFIRM_BUTTON = i18n.translate(
  'xpack.securitySolution.manuelRuleRun.confirmButton',
  {
    defaultMessage: 'Run',
  }
);

export const MANUAL_RULE_RUN_CANCEL_BUTTON = i18n.translate(
  'xpack.securitySolution.manuelRuleRun.cancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

export const MANUAL_RULE_RUN_INVALID_TIME_RANGE_ERROR = i18n.translate(
  'xpack.securitySolution.manuelRuleRun.invalidTimeRangeError',
  {
    defaultMessage: 'Selected time range is invalid',
  }
);

export const MANUAL_RULE_RUN_FUTURE_TIME_RANGE_ERROR = i18n.translate(
  'xpack.securitySolution.manuelRuleRun.futureTimeRangeError',
  {
    defaultMessage: 'Manual rule run cannot be scheduled for the future',
  }
);

export const MANUAL_RULE_RUN_START_DATE_OUT_OF_RANGE_ERROR = (maxDaysLookback: number) =>
  i18n.translate('xpack.securitySolution.manuelRuleRun.startDateIsOutOfRangeError', {
    values: { maxDaysLookback },
    defaultMessage:
      'Manual rule run cannot be scheduled earlier than {maxDaysLookback, plural, =1 {# day} other {# days}} ago',
  });
