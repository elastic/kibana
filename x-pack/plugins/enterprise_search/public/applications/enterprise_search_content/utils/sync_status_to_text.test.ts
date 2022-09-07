/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SyncStatus } from '../../../../common/types/connectors';

import { syncStatusToColor, syncStatusToText } from './sync_status_to_text';

describe('syncStatusToText', () => {
  it('should return correct value for completed', () => {
    expect(syncStatusToText(SyncStatus.COMPLETED)).toEqual('Sync complete');
  });
  it('should return correct value for error', () => {
    expect(syncStatusToText(SyncStatus.ERROR)).toEqual('Sync failure');
  });
  it('should return correct value for in progress', () => {
    expect(syncStatusToText(SyncStatus.IN_PROGRESS)).toEqual('Sync in progress');
  });
});

describe('syncStatusToColor', () => {
  it('should return correct value for completed', () => {
    expect(syncStatusToColor(SyncStatus.COMPLETED)).toEqual('success');
  });
  it('should return correct value for error', () => {
    expect(syncStatusToColor(SyncStatus.ERROR)).toEqual('danger');
  });
  it('should return correct value for in progress', () => {
    expect(syncStatusToColor(SyncStatus.IN_PROGRESS)).toEqual('warning');
  });
});
