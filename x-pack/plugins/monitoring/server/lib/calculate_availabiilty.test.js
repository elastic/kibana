/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { calculateAvailability } from './calculate_availability';

describe('Calculate Availability', () => {
  it('is available', () => {
    const input = moment();
    expect(calculateAvailability(input)).toBe(true);
  });

  it('is not available', () => {
    const input = moment().subtract(11, 'minutes');
    expect(calculateAvailability(input)).toBe(false);
  });
});
