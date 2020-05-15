/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { Snapshot } from '../../../common/runtime_types';

export interface GetSnapshotPayload {
  dateRangeStart: string;
  dateRangeEnd: string;
  filters?: string;
}

export const getSnapshotCountAction = createAction<GetSnapshotPayload>('GET_SNAPSHOT_COUNT');
export const getSnapshotCountActionSuccess = createAction<Snapshot>('GET_SNAPSHOT_COUNT_SUCCESS');
export const getSnapshotCountActionFail = createAction<Error>('GET_SNAPSHOT_COUNT_FAIL');
