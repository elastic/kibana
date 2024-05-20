/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildTopNFlowCountQuery, buildTopNFlowQuery } from './query.top_n_flow_network.dsl';
import { mockOptions, mockCountOptions, expectedDsl, expectedCountDsl } from './__mocks__';

describe('buildTopNFlowQuery', () => {
  test('build query from options correctly', () => {
    expect(buildTopNFlowQuery(mockOptions)).toEqual(expectedDsl);
  });
});

describe('buildTopNFlowCountQuery', () => {
  test('build query from options correctly', () => {
    expect(buildTopNFlowCountQuery(mockCountOptions)).toEqual(expectedCountDsl);
  });
});
