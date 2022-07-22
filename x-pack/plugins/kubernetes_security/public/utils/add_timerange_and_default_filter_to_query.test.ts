/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FILTER_QUERY } from '../../common/constants';
import { addTimerangeAndDefaultFilterToQuery } from './add_timerange_and_default_filter_to_query';

const TEST_QUERY =
  '{"bool":{"must":[],"filter":[{"bool":{"should":[{"match":{"process.entry_leader.same_as_process":true}}],"minimum_should_match":1}}],"should":[],"must_not":[]}}';
const TEST_INVALID_QUERY = '{"bool":{"must":[';
const TEST_EMPTY_STRING = '';
const TEST_DATE = '2022-06-09T22:36:46.628Z';
const VALID_RESULT =
  '{"bool":{"must":[],"filter":[{"bool":{"should":[{"exists":{"field":"process.entry_leader.entity_id"}}],"minimum_should_match":1}},{"bool":{"should":[{"match":{"process.entry_leader.same_as_process":true}}],"minimum_should_match":1}},{"range":{"@timestamp":{"gte":"2022-06-09T22:36:46.628Z","lte":"2022-06-09T22:36:46.628Z"}}}],"should":[],"must_not":[]}}';

describe('addTimerangeAndDefaultFilterToQuery(query, startDate, endDate)', () => {
  it('works for valid query, startDate, and endDate', () => {
    expect(addTimerangeAndDefaultFilterToQuery(TEST_QUERY, TEST_DATE, TEST_DATE)).toEqual(
      VALID_RESULT
    );
  });
  it('works with missing filter in bool', () => {
    expect(addTimerangeAndDefaultFilterToQuery('{"bool":{}}', TEST_DATE, TEST_DATE)).toEqual(
      '{"bool":{"filter":[{"range":{"@timestamp":{"gte":"2022-06-09T22:36:46.628Z","lte":"2022-06-09T22:36:46.628Z"}}}]}}'
    );
  });
  it('returns default query with invalid JSON query', () => {
    expect(addTimerangeAndDefaultFilterToQuery(TEST_INVALID_QUERY, TEST_DATE, TEST_DATE)).toEqual(
      DEFAULT_FILTER_QUERY
    );
    expect(addTimerangeAndDefaultFilterToQuery(TEST_EMPTY_STRING, TEST_DATE, TEST_DATE)).toEqual(
      DEFAULT_FILTER_QUERY
    );
    expect(addTimerangeAndDefaultFilterToQuery('{}', TEST_DATE, TEST_DATE)).toEqual(
      DEFAULT_FILTER_QUERY
    );
  });
  it('returns default query with invalid startDate or endDate', () => {
    expect(addTimerangeAndDefaultFilterToQuery(TEST_QUERY, TEST_EMPTY_STRING, TEST_DATE)).toEqual(
      DEFAULT_FILTER_QUERY
    );
    expect(addTimerangeAndDefaultFilterToQuery(TEST_QUERY, TEST_DATE, TEST_EMPTY_STRING)).toEqual(
      DEFAULT_FILTER_QUERY
    );
  });
});
