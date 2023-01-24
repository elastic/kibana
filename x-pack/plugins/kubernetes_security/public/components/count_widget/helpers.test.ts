/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addResourceTypeToFilterQuery, numberFormatter } from './helpers';

const TEST_DATA_ARRAY: number[] = [
  32,
  2200,
  999232,
  1310000,
  999999999,
  999999999999,
  1230000000000,
  Infinity,
  NaN,
  -1,
  -Infinity,
  1e15 - 1,
];

const TEST_QUERY = `{"bool":{"must":[],"filter":[],"should":[],"must_not":[]}}`;

const RESULT_QUERY_NODE =
  '{"bool":{"must":[],"filter":[{"bool":{"should":[{"match_phrase":{"orchestrator.resource.type":"node"}}]}}],"should":[],"must_not":[]}}';
const RESULT_QUERY_POD =
  '{"bool":{"must":[],"filter":[{"bool":{"should":[{"match_phrase":{"orchestrator.resource.type":"pod"}}]}}],"should":[],"must_not":[]}}';

describe('Testing Helper functions', () => {
  it('Testing numberFormatter helper function', () => {
    expect(numberFormatter(TEST_DATA_ARRAY[0])).toBe('32');
    expect(numberFormatter(TEST_DATA_ARRAY[1])).toBe('2K');
    expect(numberFormatter(TEST_DATA_ARRAY[2])).toBe('999K');
    expect(numberFormatter(TEST_DATA_ARRAY[3])).toBe('1.3M');
    expect(numberFormatter(TEST_DATA_ARRAY[4])).toBe('999M');
    expect(numberFormatter(TEST_DATA_ARRAY[5])).toBe('999B');
    expect(numberFormatter(TEST_DATA_ARRAY[6])).toBe('1.2T');
    expect(numberFormatter(TEST_DATA_ARRAY[7])).toBe('NaN');
    expect(numberFormatter(TEST_DATA_ARRAY[8])).toBe('NaN');
    expect(numberFormatter(TEST_DATA_ARRAY[9])).toBe('NaN');
    expect(numberFormatter(TEST_DATA_ARRAY[10])).toBe('NaN');
    expect(numberFormatter(TEST_DATA_ARRAY[11])).toBe('999T');
  });

  it('Testing addResourceTypeToFilterQuery helper function', () => {
    expect(addResourceTypeToFilterQuery(TEST_QUERY, 'node')).toBe(RESULT_QUERY_NODE);
    expect(addResourceTypeToFilterQuery(TEST_QUERY, 'pod')).toBe(RESULT_QUERY_POD);
  });
});
