/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { buildTopNFlowQuery } from './query.top_n_flow_network.dsl';
import { mockOptions, expectedDsl } from './__mocks__';

describe('buildTopNFlowQuery', () => {
  test('build query from options correctly', () => {
    expect(buildTopNFlowQuery(mockOptions)).toEqual(expectedDsl);
  });
});
