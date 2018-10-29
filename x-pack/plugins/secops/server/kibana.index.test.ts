/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { amMocking } from './kibana.index';

describe('kibana.index', () => {
  describe('#amMocking', () => {
    afterEach(() => delete process.env.INGEST_MOCKS);

    test('should return true when process.ENV.mocking is set to a lower case string true', () => {
      process.env.INGEST_MOCKS = 'true';
      expect(amMocking()).toEqual(true);
    });
    test('should return false when process.ENV.mocking is not set', () => {
      expect(amMocking()).toEqual(false);
    });
    test('should return false when process.ENV.mocking is not set to a lower case string (since I am picky)', () => {
      process.env.INGEST_MOCKS = 'TRUE';
      expect(amMocking()).toEqual(false);
    });
  });
});
