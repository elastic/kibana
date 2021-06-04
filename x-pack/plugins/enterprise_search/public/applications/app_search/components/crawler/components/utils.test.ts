/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { determineTimestampDisplay } from './utils';

describe('determineTimestampDisplay', () => {
  it('uses plain language if the timestamp is from today', () => {
    const timestamp = moment().subtract(1, 'hour');

    expect(determineTimestampDisplay(timestamp.format())).toEqual(timestamp.fromNow());
  });

  it('uses a date if the timestamp is before today', () => {
    const timestamp = moment().subtract(2, 'week');

    expect(determineTimestampDisplay(timestamp.format())).toEqual(timestamp.format('ll'));
  });
});
