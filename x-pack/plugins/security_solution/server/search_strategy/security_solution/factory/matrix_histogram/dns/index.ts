/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildDnsHistogramQuery } from './query.dns_histogram.dsl';
import { getDnsParsedData } from './helpers';
import { MatrixHistogramTypeToAggName } from '../../../../../../common/search_strategy';

export const dnsMatrixHistogramConfig = {
  buildDsl: buildDnsHistogramQuery,
  aggName: MatrixHistogramTypeToAggName.dns,
  parseKey: 'dns_question_name.buckets',
  parser: getDnsParsedData,
};
