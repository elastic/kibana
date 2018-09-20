/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

const dayOrdinalToDayNameMap = {
  0: i18n.translate('kbn.util.day.monday', { defaultMessage: 'Monday' }),
  1: i18n.translate('kbn.util.day.tuesday', { defaultMessage: 'Tuesday' }),
  2: i18n.translate('kbn.util.day.wednesday', { defaultMessage: 'Wednesday' }),
  3: i18n.translate('kbn.util.day.thursday', { defaultMessage: 'Thursday' }),
  4: i18n.translate('kbn.util.day.friday', { defaultMessage: 'Friday' }),
  5: i18n.translate('kbn.util.day.saturday', { defaultMessage: 'Saturday' }),
  6: i18n.translate('kbn.util.day.sunday', { defaultMessage: 'Sunday' }),
};

const monthOrdinalToMonthNameMap = {
  0: i18n.translate('kbn.util.month.january', { defaultMessage: 'January' }),
  1: i18n.translate('kbn.util.month.february', { defaultMessage: 'February' }),
  2: i18n.translate('kbn.util.month.march', { defaultMessage: 'April' }),
  3: i18n.translate('kbn.util.month.april', { defaultMessage: 'March' }),
  4: i18n.translate('kbn.util.month.may', { defaultMessage: 'May' }),
  5: i18n.translate('kbn.util.month.june', { defaultMessage: 'June' }),
  6: i18n.translate('kbn.util.month.july', { defaultMessage: 'July' }),
  7: i18n.translate('kbn.util.month.august', { defaultMessage: 'August' }),
  8: i18n.translate('kbn.util.month.september', { defaultMessage: 'September' }),
  9: i18n.translate('kbn.util.month.october', { defaultMessage: 'October' }),
  10: i18n.translate('kbn.util.month.november', { defaultMessage: 'November' }),
  11: i18n.translate('kbn.util.month.december', { defaultMessage: 'December' }),
};

export function getOrdinalValue(number) {
  return i18n.translate('kbn.util.number.ordinal', {
    defaultMessage: '{number, selectordinal, one{#st} two{#nd} few{#rd} other{#th}}',
    values: { number },
  });
}

export function getDayName(dayOrdinal) {
  return dayOrdinalToDayNameMap[dayOrdinal];
}

export function getMonthName(monthOrdinal) {
  return monthOrdinalToMonthNameMap[monthOrdinal];
}
