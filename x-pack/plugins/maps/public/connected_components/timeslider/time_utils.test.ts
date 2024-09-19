/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInterval } from './time_utils';

describe('getInterval', () => {
  test('should provide interval of 1 day for 7 day range', () => {
    expect(getInterval(1617630946622, 1618235746622)).toBe(86400000);
  });

  test('should provide interval of 3 hours for 24 hour range', () => {
    expect(getInterval(1618150382531, 1618236782531)).toBe(10800000);
  });

  test('should provide interval of 90 minues for 12 hour range', () => {
    expect(getInterval(1618193892632, 1618237092632)).toBe(5400000);
  });

  test('should provide interval of 30 minues for 4 hour range', () => {
    expect(getInterval(1618222509189, 1618236909189)).toBe(1800000);
  });

  test('should provide interval of 10 minues for 1 hour range', () => {
    expect(getInterval(1618233266459, 1618236866459)).toBe(600000);
  });
});
