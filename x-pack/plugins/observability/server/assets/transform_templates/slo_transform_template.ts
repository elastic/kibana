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
  TransformTimeSync,
} from '@elastic/elasticsearch/lib/api/types';

export interface TransformSettings {
  frequency: TransformPutTransformRequest['frequency'];
  sync_field: TransformTimeSync['field'];
  sync_delay: TransformTimeSync['delay'];
}

export const getSLOTransformTemplate = (
  transformId: string,
  source: TransformSource,
  destination: TransformDestination,
  groupBy: TransformPivot['group_by'] = {},
  aggregations: TransformPivot['aggregations'] = {},
  settings: TransformSettings
): TransformPutTransformRequest => ({
  transform_id: transformId,
  source,
  frequency: settings.frequency,
  dest: destination,
  settings: {
    deduce_mappings: false,
  },
  sync: {
    time: {
      field: settings.sync_field,
      delay: settings.sync_delay,
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
