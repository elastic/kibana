/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MatrixHistogramTypeToAggName } from '../../../../../../common/search_strategy';
import { buildAuthenticationsHistogramQuery } from './query.authentications_histogram.dsl';

export const authenticationsMatrixHistogramConfig = {
  buildDsl: buildAuthenticationsHistogramQuery,
  aggName: MatrixHistogramTypeToAggName.authentications,
  parseKey: 'events.buckets',
};
