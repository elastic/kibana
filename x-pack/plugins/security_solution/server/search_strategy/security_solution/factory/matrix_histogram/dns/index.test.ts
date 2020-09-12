/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
      aggName: 'aggregations.NetworkDns.buckets',
      parseKey: 'dns.buckets',
      buildDsl: buildDnsHistogramQuery,
      parser: getDnsParsedData,
    });
  });
});
