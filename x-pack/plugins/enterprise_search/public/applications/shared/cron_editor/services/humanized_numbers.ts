/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type DayOrdinal = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type MonthOrdinal = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

// The international ISO standard dictates Monday as the first day of the week, but cron patterns
// use Sunday as the first day, so we're going with the cron way.
const dayOrdinalToDayNameMap = {
  0: i18n.translate('xpack.enterpriseSearch.cronEditor.day.sunday', { defaultMessage: 'Sunday' }),
  1: i18n.translate('xpack.enterpriseSearch.cronEditor.day.monday', { defaultMessage: 'Monday' }),
  2: i18n.translate('xpack.enterpriseSearch.cronEditor.day.tuesday', { defaultMessage: 'Tuesday' }),
  3: i18n.translate('xpack.enterpriseSearch.cronEditor.day.wednesday', {
    defaultMessage: 'Wednesday',
  }),
  4: i18n.translate('xpack.enterpriseSearch.cronEditor.day.thursday', {
    defaultMessage: 'Thursday',
  }),
  5: i18n.translate('xpack.enterpriseSearch.cronEditor.day.friday', { defaultMessage: 'Friday' }),
  6: i18n.translate('xpack.enterpriseSearch.cronEditor.day.saturday', {
    defaultMessage: 'Saturday',
  }),
};

const monthOrdinalToMonthNameMap = {
  0: i18n.translate('xpack.enterpriseSearch.cronEditor.month.january', {
    defaultMessage: 'January',
  }),
  1: i18n.translate('xpack.enterpriseSearch.cronEditor.month.february', {
    defaultMessage: 'February',
  }),
  2: i18n.translate('xpack.enterpriseSearch.cronEditor.month.march', { defaultMessage: 'March' }),
  3: i18n.translate('xpack.enterpriseSearch.cronEditor.month.april', { defaultMessage: 'April' }),
  4: i18n.translate('xpack.enterpriseSearch.cronEditor.month.may', { defaultMessage: 'May' }),
  5: i18n.translate('xpack.enterpriseSearch.cronEditor.month.june', { defaultMessage: 'June' }),
  6: i18n.translate('xpack.enterpriseSearch.cronEditor.month.july', { defaultMessage: 'July' }),
  7: i18n.translate('xpack.enterpriseSearch.cronEditor.month.august', { defaultMessage: 'August' }),
  8: i18n.translate('xpack.enterpriseSearch.cronEditor.month.september', {
    defaultMessage: 'September',
  }),
  9: i18n.translate('xpack.enterpriseSearch.cronEditor.month.october', {
    defaultMessage: 'October',
  }),
  10: i18n.translate('xpack.enterpriseSearch.cronEditor.month.november', {
    defaultMessage: 'November',
  }),
  11: i18n.translate('xpack.enterpriseSearch.cronEditor.month.december', {
    defaultMessage: 'December',
  }),
};

export function getOrdinalValue(number: number): string {
  // TODO: This is breaking reporting pdf generation. Possibly due to phantom not setting locale,
  // which is needed by i18n (formatjs). Need to verify, fix, and restore i18n in place of static stings.
  // return i18n.translate('xpack.enterpriseSearch.cronEditor.number.ordinal', {
  //   defaultMessage: '{number, selectordinal, one{#st} two{#nd} few{#rd} other{#th}}',
  //   values: { number },
  // });
  // TODO: https://github.com/elastic/kibana/issues/27136

  // Protects against falsey (including 0) values
  const num = number && number.toString();
  const lastDigitString = num && num.substr(-1);
  let ordinal;

  if (!lastDigitString) {
    return number.toString();
  }

  const lastDigitNumeric = parseFloat(lastDigitString);

  switch (lastDigitNumeric) {
    case 1:
      ordinal = 'st';
      break;
    case 2:
      ordinal = 'nd';
      break;
    case 3:
      ordinal = 'rd';
      break;
    default:
      ordinal = 'th';
  }

  return `${num}${ordinal}`;
}

export function getDayName(dayOrdinal: DayOrdinal): string {
  return dayOrdinalToDayNameMap[dayOrdinal];
}

export function getMonthName(monthOrdinal: MonthOrdinal): string {
  return monthOrdinalToMonthNameMap[monthOrdinal];
}
