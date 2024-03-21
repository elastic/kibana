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
import { SLO_RESOURCES_VERSION } from '../../../common/constants';

export interface TransformSettings {
  frequency: TransformPutTransformRequest['frequency'];
  sync_field: TransformTimeSync['field'];
  sync_delay: TransformTimeSync['delay'];
}

export const getSLOTransformTemplate = (
  transformId: string,
  description: string,
  source: TransformSource,
  destination: TransformDestination,
  groupBy: TransformPivot['group_by'] = {},
  aggregations: TransformPivot['aggregations'] = {},
  settings: TransformSettings
): TransformPutTransformRequest => ({
  transform_id: transformId,
  description,
  source,
  frequency: settings.frequency,
  dest: destination,
  settings: {
    deduce_mappings: false,
    unattended: true,
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
  defer_validation: true,
  _meta: {
    version: SLO_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
});
