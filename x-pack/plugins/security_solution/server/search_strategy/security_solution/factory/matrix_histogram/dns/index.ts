/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildDnsHistogramQuery } from './query.dns_histogram.dsl';
import { getDnsParsedData } from './helpers';

export const dnsMatrixHistogramConfig = {
  buildDsl: buildDnsHistogramQuery,
  aggName: 'aggregations.dns_name_query_count.buckets',
  parseKey: 'questionName.buckets',
  parser: getDnsParsedData,
};
