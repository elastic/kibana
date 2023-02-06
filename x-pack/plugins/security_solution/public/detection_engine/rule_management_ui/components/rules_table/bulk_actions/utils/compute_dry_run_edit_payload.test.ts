/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkActionEditType } from '../../../../../../../common/detection_engine/rule_management/api/rules/bulk_actions/request_schema';

import { computeDryRunEditPayload } from './compute_dry_run_edit_payload';

describe('computeDryRunEditPayload', () => {
  test.each([
    [BulkActionEditType.set_index_patterns, []],
    [BulkActionEditType.delete_index_patterns, []],
    [BulkActionEditType.add_index_patterns, []],
    [BulkActionEditType.add_tags, []],
    [BulkActionEditType.delete_index_patterns, []],
    [BulkActionEditType.set_tags, []],
    [BulkActionEditType.set_timeline, { timeline_id: '', timeline_title: '' }],
  ])('should return correct payload for bulk edit action %s', (editAction, value) => {
    const payload = computeDryRunEditPayload(editAction);
    expect(payload).toHaveLength(1);
    expect(payload?.[0].type).toEqual(editAction);
    expect(payload?.[0].value).toEqual(value);
  });
});
