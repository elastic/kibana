/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

// The international ISO standard dictates Monday as the first day of the week, but cron patterns
// use Sunday as the first day, so we're going with the cron way.
const dayOrdinalToDayNameMap = {
  0: i18n.translate('xpack.rollupJobs.util.day.sunday', { defaultMessage: 'Sunday' }),
  1: i18n.translate('xpack.rollupJobs.util.day.monday', { defaultMessage: 'Monday' }),
  2: i18n.translate('xpack.rollupJobs.util.day.tuesday', { defaultMessage: 'Tuesday' }),
  3: i18n.translate('xpack.rollupJobs.util.day.wednesday', { defaultMessage: 'Wednesday' }),
  4: i18n.translate('xpack.rollupJobs.util.day.thursday', { defaultMessage: 'Thursday' }),
  5: i18n.translate('xpack.rollupJobs.util.day.friday', { defaultMessage: 'Friday' }),
  6: i18n.translate('xpack.rollupJobs.util.day.saturday', { defaultMessage: 'Saturday' }),
};

const monthOrdinalToMonthNameMap = {
  0: i18n.translate('xpack.rollupJobs.util.month.january', { defaultMessage: 'January' }),
  1: i18n.translate('xpack.rollupJobs.util.month.february', { defaultMessage: 'February' }),
  2: i18n.translate('xpack.rollupJobs.util.month.march', { defaultMessage: 'April' }),
  3: i18n.translate('xpack.rollupJobs.util.month.april', { defaultMessage: 'March' }),
  4: i18n.translate('xpack.rollupJobs.util.month.may', { defaultMessage: 'May' }),
  5: i18n.translate('xpack.rollupJobs.util.month.june', { defaultMessage: 'June' }),
  6: i18n.translate('xpack.rollupJobs.util.month.july', { defaultMessage: 'July' }),
  7: i18n.translate('xpack.rollupJobs.util.month.august', { defaultMessage: 'August' }),
  8: i18n.translate('xpack.rollupJobs.util.month.september', { defaultMessage: 'September' }),
  9: i18n.translate('xpack.rollupJobs.util.month.october', { defaultMessage: 'October' }),
  10: i18n.translate('xpack.rollupJobs.util.month.november', { defaultMessage: 'November' }),
  11: i18n.translate('xpack.rollupJobs.util.month.december', { defaultMessage: 'December' }),
};

export function getOrdinalValue(number) {
  // TODO: This is breaking reporting pdf generation. Possibly due to phantom not setting locale,
  // which is needed by i18n (formatjs). Need to verify, fix, and restore i18n in place of static stings.
  // return i18n.translate('xpack.rollupJobs.util.number.ordinal', {
  //   defaultMessage: '{number, selectordinal, one{#st} two{#nd} few{#rd} other{#th}}',
  //   values: { number },
  // });
  // TODO: https://github.com/elastic/kibana/issues/27136

  // Protects against falsey (including 0) values
  const num = number && number.toString();
  let lastDigit = num && num.substr(-1);
  let ordinal;

  if(!lastDigit) {
    return number;
  }
  lastDigit = parseFloat(lastDigit);

  switch(lastDigit) {
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

export function getDayName(dayOrdinal) {
  return dayOrdinalToDayNameMap[dayOrdinal];
}

export function getMonthName(monthOrdinal) {
  return monthOrdinalToMonthNameMap[monthOrdinal];
}
