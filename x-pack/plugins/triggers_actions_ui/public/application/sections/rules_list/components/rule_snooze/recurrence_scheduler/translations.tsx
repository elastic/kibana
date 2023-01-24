/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { RRuleFrequency } from '../../../../../../types';

export const i18nNthWeekday = (dayOfWeek: string) => [
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurLast', {
    defaultMessage: 'Monthly on the last {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurFirst', {
    defaultMessage: 'Monthly on the first {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurSecond', {
    defaultMessage: 'Monthly on the second {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurThird', {
    defaultMessage: 'Monthly on the third {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurFourth', {
    defaultMessage: 'Monthly on the fourth {dayOfWeek}',
    values: { dayOfWeek },
  }),
];

export const i18nNthWeekdayShort = (dayOfWeek: string) => [
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurLastShort', {
    defaultMessage: 'On the last {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurFirstShort', {
    defaultMessage: 'On the 1st {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurSecondShort', {
    defaultMessage: 'On the 2nd {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurThirdShort', {
    defaultMessage: 'On the 3rd {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurFourthShort', {
    defaultMessage: 'On the 4th {dayOfWeek}',
    values: { dayOfWeek },
  }),
];

export const i18nFreqSummary = (interval: number) => ({
  [RRuleFrequency.DAILY]: i18n.translate(
    'xpack.triggersActionsUI.ruleSnoozeScheduler.recurDaySummary',
    {
      defaultMessage: '{interval, plural, one {day} other {# days}}',
      values: { interval },
    }
  ),
  [RRuleFrequency.WEEKLY]: i18n.translate(
    'xpack.triggersActionsUI.ruleSnoozeScheduler.recurWeekSummary',
    {
      defaultMessage: '{interval, plural, one {week} other {# weeks}}',
      values: { interval },
    }
  ),
  [RRuleFrequency.MONTHLY]: i18n.translate(
    'xpack.triggersActionsUI.ruleSnoozeScheduler.recurMonthSummary',
    {
      defaultMessage: '{interval, plural, one {month} other {# months}}',
      values: { interval },
    }
  ),
  [RRuleFrequency.YEARLY]: i18n.translate(
    'xpack.triggersActionsUI.ruleSnoozeScheduler.recurYearSummary',
    {
      defaultMessage: '{interval, plural, one {year} other {# years}}',
      values: { interval },
    }
  ),
});

export const i18nEndControlOptions = (interval: number) => [
  {
    text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurDay', {
      defaultMessage: '{interval, plural, one {day} other {days}}',
      values: { interval },
    }),
    value: RRuleFrequency.DAILY,
    'data-test-subj': 'ruleSnoozeSchedulerRecurDay',
  },
  {
    text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurWeek', {
      defaultMessage: '{interval, plural, one {week} other {weeks}}',
      values: { interval },
    }),
    value: RRuleFrequency.WEEKLY,
    'data-test-subj': 'ruleSnoozeSchedulerRecurWeek',
  },
  {
    text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurMonth', {
      defaultMessage: '{interval, plural, one {month} other {months}}',
      values: { interval },
    }),
    value: RRuleFrequency.MONTHLY,
    'data-test-subj': 'ruleSnoozeSchedulerRecurMonth',
  },
  {
    text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurYear', {
      defaultMessage: '{interval, plural, one {year} other {years}}',
      values: { interval },
    }),
    value: RRuleFrequency.YEARLY,
    'data-test-subj': 'ruleSnoozeSchedulerRecurYear',
  },
];
