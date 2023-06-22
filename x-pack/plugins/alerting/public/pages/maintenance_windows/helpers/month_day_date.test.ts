/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { monthDayDate } from './month_day_date';

describe('monthDayDate', () => {
  test('should parse the month and date', () => {
    expect(monthDayDate(moment('2023-03-23'))).toEqual('March 23');
  });
});
