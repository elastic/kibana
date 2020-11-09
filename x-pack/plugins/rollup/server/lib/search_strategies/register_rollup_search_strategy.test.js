/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { registerRollupSearchStrategy } from './register_rollup_search_strategy';

describe('Register Rollup Search Strategy', () => {
  let addSearchStrategy;
  let getRollupService;

  beforeEach(() => {
    addSearchStrategy = jest.fn().mockName('addSearchStrategy');
    getRollupService = jest.fn().mockName('getRollupService');
  });

  test('should run initialization', () => {
    registerRollupSearchStrategy(addSearchStrategy, getRollupService);

    expect(addSearchStrategy).toHaveBeenCalled();
  });
});
