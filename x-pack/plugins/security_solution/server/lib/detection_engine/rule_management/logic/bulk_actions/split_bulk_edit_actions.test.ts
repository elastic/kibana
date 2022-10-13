/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkActionEditPayload } from '../../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import { BulkActionEditType } from '../../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';

import { splitBulkEditActions } from './split_bulk_edit_actions';

const bulkEditActions: BulkActionEditPayload[] = [
  { type: BulkActionEditType.add_index_patterns, value: ['test'] },
  { type: BulkActionEditType.set_index_patterns, value: ['test'] },
  { type: BulkActionEditType.delete_index_patterns, value: ['test'] },
  { type: BulkActionEditType.add_tags, value: ['test'] },
  { type: BulkActionEditType.delete_tags, value: ['test'] },
  { type: BulkActionEditType.set_tags, value: ['test'] },
  {
    type: BulkActionEditType.set_timeline,
    value: { timeline_id: 'a-1', timeline_title: 'Test title' },
  },
];

describe('splitBulkEditActions', () => {
  test('should split actions correctly', () => {
    const { attributesActions, paramsActions } = splitBulkEditActions(bulkEditActions);

    expect(attributesActions).toEqual([
      { type: BulkActionEditType.add_tags, value: ['test'] },
      { type: BulkActionEditType.delete_tags, value: ['test'] },
      { type: BulkActionEditType.set_tags, value: ['test'] },
    ]);
    expect(paramsActions).toEqual([
      { type: BulkActionEditType.add_index_patterns, value: ['test'] },
      { type: BulkActionEditType.set_index_patterns, value: ['test'] },
      { type: BulkActionEditType.delete_index_patterns, value: ['test'] },
      {
        type: BulkActionEditType.set_timeline,
        value: { timeline_id: 'a-1', timeline_title: 'Test title' },
      },
    ]);
  });

  test('should handle split correctly if actions list is empty', () => {
    const { attributesActions, paramsActions } = splitBulkEditActions([]);

    expect(attributesActions).toEqual([]);
    expect(paramsActions).toEqual([]);
  });
});
