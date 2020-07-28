/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { getPastDays } from './get_past_days';

describe('getPastDays', () => {
  test('Returns 2 days that have passed from the current date', () => {
    const pastDate = moment().subtract(2, 'days').startOf('day').toString();

    expect(getPastDays(pastDate)).toEqual(2);
  });

  test('Returns 30 days that have passed from the current date', () => {
    const pastDate = moment().subtract(30, 'days').startOf('day').toString();

    expect(getPastDays(pastDate)).toEqual(30);
  });
});
