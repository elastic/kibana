/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dnsMatrixHistogramConfig } from '.';
import { buildDnsHistogramQuery } from './query.dns_histogram.dsl';
import { getDnsParsedData } from './helpers';

jest.mock('./query.dns_histogram.dsl', () => ({
  buildDnsHistogramQuery: jest.fn(),
}));

jest.mock('./helpers', () => ({
  getDnsParsedData: jest.fn(),
}));

describe('dnsMatrixHistogramConfig', () => {
  test('should export dnsMatrixHistogramConfig corrrectly', () => {
    expect(dnsMatrixHistogramConfig).toEqual({
      aggName: 'aggregations.dns_name_query_count.buckets',
      parseKey: 'dns_question_name.buckets',
      buildDsl: buildDnsHistogramQuery,
      parser: getDnsParsedData,
    });
  });
});
