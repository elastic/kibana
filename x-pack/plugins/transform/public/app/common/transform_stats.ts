/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TRANSFORM_STATE } from '../../../common/constants';

import { TransformListRow } from './transform_list';

export function getTransformProgress(item: TransformListRow) {
  if (isCompletedBatchTransform(item)) {
    return 100;
  }

  const progress = item?.stats?.checkpointing?.next?.checkpoint_progress?.percent_complete;
  return progress !== undefined ? Math.round(progress) : undefined;
}

export function isCompletedBatchTransform(item: TransformListRow) {
  // If `checkpoint=1`, `sync` is missing from the config and state is stopped,
  // then this is a completed batch transform.
  return (
    item.stats.checkpointing.last.checkpoint === 1 &&
    item.config.sync === undefined &&
    item.stats.state === TRANSFORM_STATE.STOPPED
  );
}
