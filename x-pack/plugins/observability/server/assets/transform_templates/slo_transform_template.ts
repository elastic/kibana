/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TransformDestination,
  TransformPivot,
  TransformPutTransformRequest,
  TransformSource,
} from '@elastic/elasticsearch/lib/api/types';

export const getSLOTransformTemplate = (
  transformId: string,
  source: TransformSource,
  destination: TransformDestination,
  groupBy: TransformPivot['group_by'] = {},
  aggregations: TransformPivot['aggregations'] = {}
): TransformPutTransformRequest => ({
  transform_id: transformId,
  source,
  frequency: '1m',
  dest: destination,
  settings: {
    deduce_mappings: false,
  },
  sync: {
    time: {
      field: '@timestamp',
      delay: '60s',
    },
  },
  pivot: {
    group_by: groupBy,
    aggregations,
  },
  _meta: {
    version: 1,
  },
});
