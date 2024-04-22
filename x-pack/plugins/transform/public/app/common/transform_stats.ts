/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRANSFORM_STATE } from '../../../common/constants';

import type { TransformListRow } from './transform_list';
import type {
  PutTransformsLatestRequestSchema,
  PutTransformsPivotRequestSchema,
} from '../../../common/api_schemas/transforms';

type TransformItem = Omit<TransformListRow, 'config'> & {
  config:
    | TransformListRow['config']
    | PutTransformsLatestRequestSchema
    | PutTransformsPivotRequestSchema;
};

export function getTransformProgress(item: TransformItem) {
  if (isCompletedBatchTransform(item)) {
    return 100;
  }

  const progress = item?.stats?.checkpointing?.next?.checkpoint_progress?.percent_complete;
  return progress !== undefined ? Math.round(progress) : undefined;
}

export function isCompletedBatchTransform(item: TransformItem) {
  // If `checkpoint=1`, `sync` is missing from the config and state is stopped,
  // then this is a completed batch transform.
  return (
    item.stats &&
    item.config &&
    item.stats.checkpointing?.last.checkpoint === 1 &&
    item.config.sync === undefined &&
    item.stats.state === TRANSFORM_STATE.STOPPED
  );
}
