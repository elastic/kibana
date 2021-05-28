/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Moment } from 'moment-timezone';

export function mockMoment() {
  // avoid timezone issues
  jest.spyOn(moment.prototype, 'format').mockImplementation(function (this: Moment) {
    return `Sept 4, 2020  9:31:38 AM`;
  });

  // convert relative time to absolute time to avoid timing issues
  jest.spyOn(moment.prototype, 'fromNow').mockImplementation(function (this: Moment) {
    return `15 minutes ago`;
  });

  // use static locale string to avoid issues
  jest.spyOn(moment.prototype, 'toLocaleString').mockImplementation(function (this: Moment) {
    return `Thu May 09 2019 10:15:11 GMT-0400`;
  });

  // mock add and sub
  jest.spyOn(moment.prototype, 'toLocaleString').mockImplementation(function (this: Moment) {
    return `Thu May 09 2019 10:15:11 GMT-0400`;
  });
}

export function mockMomentTimezone() {
  jest.mock('moment-timezone', () => {
    return function () {
      return { tz: { guess: () => 'America/New_York' } };
    };
  });
}
