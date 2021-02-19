/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveBucketSpanInSeconds } from './alerting_service';

describe('Alerting Service', () => {
  test('should resolve maximum bucket interval', () => {
    expect(resolveBucketSpanInSeconds(['15m', '1h', '6h', '90s'])).toBe(43200);
  });
});
