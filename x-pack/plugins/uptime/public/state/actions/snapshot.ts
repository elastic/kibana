/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Snapshot } from '../../../common/runtime_types';
import { createAsyncAction } from './utils';
import { SnapShotQueryParams } from '../api';

export const getSnapshotCountAction = createAsyncAction<SnapShotQueryParams, Snapshot>(
  'GET_SNAPSHOT_COUNT'
);
