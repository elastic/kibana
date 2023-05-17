/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SNOOZE_SUCCESS_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.rulesListSnoozePanel.snoozeSuccess',
  {
    defaultMessage: 'Rule successfully snoozed',
  }
);

export const UNSNOOZE_SUCCESS_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.rulesListSnoozePanel.unsnoozeSuccess',
  {
    defaultMessage: 'Rule successfully unsnoozed',
  }
);

export const SNOOZE_FAILED_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.rulesListSnoozePanel.snoozeFailed',
  {
    defaultMessage: 'Unable to change rule snooze settings',
  }
);

export const OPEN_SNOOZE_PANEL_ARIA_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.openSnoozePanel',
  { defaultMessage: 'Open snooze panel' }
);

const SECONDS = i18n.translate('xpack.formatters.timeUnit.seconds', {
  defaultMessage: 'seconds',
});

const MINUTES = i18n.translate('xpack.formatters.timeUnit.minutes', {
  defaultMessage: 'minutes',
});

const HOURS = i18n.translate('xpack.formatters.timeUnit.hours', {
  defaultMessage: 'hours',
});

const DAYS = i18n.translate('xpack.formatters.timeUnit.days', {
  defaultMessage: 'days',
});

const WEEKS = i18n.translate('xpack.formatters.timeUnit.weeks', {
  defaultMessage: 'weeks',
});

const MONTHS = i18n.translate('xpack.formatters.timeUnit.months', {
  defaultMessage: 'months',
});

const YEARS = i18n.translate('xpack.formatters.timeUnit.years', {
  defaultMessage: 'years',
});

export const TIME_UNITS = { SECONDS, MINUTES, HOURS, DAYS, WEEKS, MONTHS, YEARS };
