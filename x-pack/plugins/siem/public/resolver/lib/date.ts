/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';

type DateFormat = Date | number | string;
export const getRelativeTimeDifference = (startDate: DateFormat, endDate: DateFormat): string => {
  // Set the threshold above which pluralization takes place https://momentjs.com/docs/#/customization/relative-time-threshold/
  moment.relativeTimeThreshold('s', 60); // Least number of seconds to be considered minute
  moment.relativeTimeThreshold('ss', 1);
  moment.relativeTimeThreshold('m', 60); // Least number of minutes to be considered an hour
  moment.relativeTimeThreshold('mm', 1);
  moment.relativeTimeThreshold('h', 24); // Least number of hours to be considered a day
  moment.relativeTimeThreshold('hh', 1);
  moment.relativeTimeThreshold('d', 28); // Least number of days to be considered a month
  moment.relativeTimeThreshold('dd', 1);
  moment.relativeTimeThreshold('M', 12); // Least number of months to be considered a year
  moment.relativeTimeThreshold('MM', 1);
  moment.relativeTimeThreshold('yy', 1);

  /** Currently on version 2.24.0 of moment. Weeks were added in 2.25.0. Will need to update 'd' and these when updated */

  // moment.relativeTimeThreshold('w', 4); // Least number of days to be considered a month
  // moment.relativeTimeThreshold('ww', 1);

  // Explicitly configure the text format being used
  moment.updateLocale('en', {
    relativeTime: {
      future: 'in %s',
      past: '%s ago',
      s: '%d second',
      ss: '%d seconds',
      m: '%d minute',
      mm: '%d minutes',
      h: '%d hour',
      //   w: '%d week',
      //   ww: '%d weeks',
      hh: '%d hours',
      d: '%d day',
      dd: '%d days',
      M: '%d month',
      MM: '%d months',
      y: '%d year',
      yy: '%d years',
    },
  });

  moment.locale(i18n.getLocale());

  const momentEndDate = moment(endDate);
  const momentStartDate = moment(startDate);
  let elapsedTime = momentEndDate.from(momentStartDate, true);

  if (elapsedTime.includes('days')) {
    // This can be removed when updated to version 2.25.0 of moment.js
    const [numStr] = elapsedTime.split(' ');
    const weekVal = Math.floor(parseInt(numStr, 10) / 7);
    if (weekVal > 0) {
      elapsedTime = `${weekVal} ${weekVal > 1 ? 'weeks' : ' week'}`;
    }
  }

  return elapsedTime;
};
