/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BulkAction,
  BulkActionEditType,
} from '../../../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';

import { computeDryRunPayload } from './compute_dry_run_payload';

describe('computeDryRunPayload', () => {
  test.each([
    [BulkAction.export],
    [BulkAction.duplicate],
    [BulkAction.delete],
    [BulkAction.enable],
    [BulkAction.disable],
  ])('should return payload undefined if action is %s', (action) => {
    expect(computeDryRunPayload(action)).toBeUndefined();
  });

  test('should return payload undefined if bulkEdit action is not defined', () => {
    expect(computeDryRunPayload(BulkAction.edit)).toBeUndefined();
  });

  test.each([
    [BulkActionEditType.set_index_patterns, []],
    [BulkActionEditType.delete_index_patterns, []],
    [BulkActionEditType.add_index_patterns, []],
    [BulkActionEditType.add_tags, []],
    [BulkActionEditType.delete_index_patterns, []],
    [BulkActionEditType.set_tags, []],
    [BulkActionEditType.set_timeline, { timeline_id: '', timeline_title: '' }],
  ])('should return correct payload for bulk edit action %s', (editAction, value) => {
    const payload = computeDryRunPayload(BulkAction.edit, editAction);
    expect(payload).toHaveLength(1);
    expect(payload?.[0].type).toEqual(editAction);
    expect(payload?.[0].value).toEqual(value);
  });
});
