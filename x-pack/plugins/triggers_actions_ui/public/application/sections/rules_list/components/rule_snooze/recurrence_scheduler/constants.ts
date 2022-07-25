/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { invert, mapValues } from 'lodash';
import moment from 'moment';
import { RRuleFrequency } from '../../../../../../types';

export const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

export const RECURRENCE_END_OPTIONS = [
  { id: 'never', label: 'Never' },
  { id: 'ondate', label: 'On date' },
  { id: 'afterx', label: 'After {x}' },
];

export const DEFAULT_REPEAT_OPTIONS = [
  {
    text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurDaily', {
      defaultMessage: 'Daily',
    }),
    value: RRuleFrequency.DAILY,
  },
  {
    text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurWeekly', {
      defaultMessage: 'Weekly',
    }),
    value: RRuleFrequency.WEEKLY,
  },
  {
    text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurMonthly', {
      defaultMessage: 'Monthly',
    }),
    value: RRuleFrequency.MONTHLY,
  },
  {
    text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurYearly', {
      defaultMessage: 'Yearly',
    }),
    value: RRuleFrequency.YEARLY,
  },
  {
    text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurCustom', {
      defaultMessage: 'Custom',
    }),
    value: 'CUSTOM',
  },
];

export const DEFAULT_RRULE_PRESETS = {
  [RRuleFrequency.DAILY]: {
    interval: 1,
  },
  [RRuleFrequency.WEEKLY]: {
    interval: 1,
  },
  [RRuleFrequency.MONTHLY]: {
    interval: 1,
  },
  [RRuleFrequency.YEARLY]: {
    interval: 1,
  },
};

export const I18N_WEEKDAY_OPTIONS = ISO_WEEKDAYS.map((n) => ({
  id: String(n),
  label: moment().isoWeekday(n).format('dd'),
}));

export const ISO_WEEKDAYS_TO_RRULE: Record<number, string> = {
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
  7: 'SU',
};

export const RRULE_WEEKDAYS_TO_ISO_WEEKDAYS = mapValues(invert(ISO_WEEKDAYS_TO_RRULE), (v) =>
  Number(v)
);
