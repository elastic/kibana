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
    defaultMessage: 'Rules notification successfully snoozed',
  }
);

export const UNSNOOZE_SUCCESS_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.rulesListSnoozePanel.unsnoozeSuccess',
  {
    defaultMessage: 'Rules notification successfully unsnoozed',
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

const getSecondsTranslation = (value: number) =>
  i18n.translate('xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.seconds', {
    defaultMessage: '{value, plural, one {# second} other {# seconds}}',
    values: { value },
  });

const getMinutesTranslation = (value: number) =>
  i18n.translate('xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.minutes', {
    defaultMessage: '{value, plural, one {# minute} other {# minutes}}',
    values: { value },
  });

const getHoursTranslation = (value: number) =>
  i18n.translate('xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.hours', {
    defaultMessage: '{value, plural, one {# hour} other {# hours}}',
    values: { value },
  });

const getDaysTranslation = (value: number) =>
  i18n.translate('xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.days', {
    defaultMessage: '{value, plural, one {# day} other {# days}}',
    values: { value },
  });

const getWeeksTranslation = (value: number) =>
  i18n.translate('xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.weeks', {
    defaultMessage: '{value, plural, one {# week} other {# weeks}}',
    values: { value },
  });

const getMonthsTranslation = (value: number) =>
  i18n.translate('xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.months', {
    defaultMessage: '{value, plural, one {# month} other {# months}}',
    values: { value },
  });

const getYearsTranslation = (value: number) =>
  i18n.translate('xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.years', {
    defaultMessage: '{value, plural, one {# year} other {# years}}',
    values: { value },
  });

export const UNITS_TRANSLATION = {
  getSecondsTranslation,
  getMinutesTranslation,
  getHoursTranslation,
  getDaysTranslation,
  getWeeksTranslation,
  getMonthsTranslation,
  getYearsTranslation,
};
