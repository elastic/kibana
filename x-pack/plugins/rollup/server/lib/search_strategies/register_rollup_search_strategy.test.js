/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { registerRollupSearchStrategy } from './register_rollup_search_strategy';

describe('Register Rollup Search Strategy', () => {
  let routeDependencies;
  let addSearchStrategy;

  beforeEach(() => {
    routeDependencies = {
      router: jest.fn().mockName('router'),
      elasticsearchService: jest.fn().mockName('elasticsearchService'),
      elasticsearch: jest.fn().mockName('elasticsearch'),
    };

    addSearchStrategy = jest.fn().mockName('addSearchStrategy');
  });

  test('should run initialization', () => {
    registerRollupSearchStrategy(routeDependencies, addSearchStrategy);

    expect(addSearchStrategy).toHaveBeenCalled();
  });
});
