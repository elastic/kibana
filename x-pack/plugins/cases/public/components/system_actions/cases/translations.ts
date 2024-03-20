/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CASE_ACTION_DESC = i18n.translate(
  'xpack.cases.systemActions.cases.selectMessageText',
  {
    defaultMessage: 'Create a case.',
  }
);

export const GROUP_BY_ALERT = i18n.translate('xpack.cases.systemActions.cases.groupByLabel', {
  defaultMessage: 'Group by alert field',
});

export const TIME_WINDOW = i18n.translate('xpack.cases.systemActions.cases.timeWindowLabel', {
  defaultMessage: 'Time window',
});

export const TIME_WINDOW_SIZE_ERROR = i18n.translate(
  'xpack.cases.systemActions.cases.timeWindowSizeError',
  {
    defaultMessage: 'Time size is required ',
  }
);

export const REOPEN_WHEN_CASE_IS_CLOSED = i18n.translate(
  'xpack.cases.systemActions.cases.reopenWhenCaseIsClosed',
  {
    defaultMessage: 'Reopen when the case is closed',
  }
);

export const DAYS = (timeValue: string) =>
  i18n.translate('xpack.cases.systemActions.cases.daysLabel', {
    defaultMessage: '{timeValue, plural, one {day} other {days}}',
    values: { timeValue },
  });

export const YEARS = (timeValue: string) =>
  i18n.translate('xpack.cases.systemActions.cases.yearsLabel', {
    defaultMessage: '{timeValue, plural, one {year} other {years}}',
    values: { timeValue },
  });

export const MONTHS = (timeValue: string) =>
  i18n.translate('xpack.cases.systemActions.cases.monthsLabel', {
    defaultMessage: '{timeValue, plural, one {month} other {months}}',
    values: { timeValue },
  });

export const WEEKS = (timeValue: string) =>
  i18n.translate('xpack.cases.systemActions.cases.weeksLabel', {
    defaultMessage: '{timeValue, plural, one {week} other {weeks}}',
    values: { timeValue },
  });
