/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { getNextMidnight } from './get_next_midnight';

describe('getNextMidnight', () => {
  const nextMidnightMoment = moment()
    .add(1, 'days')
    .startOf('day')
    .toISOString();

  expect(getNextMidnight()).toEqual(nextMidnightMoment);
});
