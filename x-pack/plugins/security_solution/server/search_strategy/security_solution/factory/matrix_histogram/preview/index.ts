/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MatrixHistogramTypeToAggName } from '../../../../../../common/search_strategy';
import { buildPreviewHistogramQuery } from './query.preview_histogram.dsl';

export const previewMatrixHistogramConfig = {
  buildDsl: buildPreviewHistogramQuery,
  aggName: MatrixHistogramTypeToAggName.preview,
  parseKey: 'preview.buckets',
};
