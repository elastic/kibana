/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addResourceTypeToFilterQuery, numberFormatter } from './helpers';
import { CountResult } from '../../../common/types/count';

const TEST_DATA_ARRAY: CountResult[] = [
  32 as unknown as CountResult,
  2200 as unknown as CountResult,
  999232 as unknown as CountResult,
  1310000 as unknown as CountResult,
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
  });

  it('Testing addResourceTypeToFilterQuery helper function', () => {
    expect(addResourceTypeToFilterQuery(TEST_QUERY, 'node')).toBe(RESULT_QUERY_NODE);
    expect(addResourceTypeToFilterQuery(TEST_QUERY, 'pod')).toBe(RESULT_QUERY_POD);
  });
});
