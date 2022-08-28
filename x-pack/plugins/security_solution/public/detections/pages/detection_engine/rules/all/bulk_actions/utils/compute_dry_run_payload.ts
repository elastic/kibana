/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkActionEditPayload } from '../../../../../../../../common/detection_engine/schemas/common/schemas';
import {
  BulkAction,
  BulkActionEditType,
} from '../../../../../../../../common/detection_engine/schemas/common/schemas';

/**
 * helper utility that creates payload for _bulk_action API in dry mode
 * @param {BulkAction} action
 * @param {BulkActionEditType | undefined} editAction
 * @returns {BulkActionEditPayload[] | undefined}
 */
export const computeDryRunPayload = (
  action: BulkAction,
  editAction?: BulkActionEditType
): BulkActionEditPayload[] | undefined => {
  if (action !== BulkAction.edit || !editAction) {
    return undefined;
  }

  switch (editAction) {
    case BulkActionEditType.add_index_patterns:
    case BulkActionEditType.delete_index_patterns:
    case BulkActionEditType.set_index_patterns:
      return [
        {
          type: editAction,
          value: [],
        },
      ];

    case BulkActionEditType.add_tags:
    case BulkActionEditType.delete_tags:
    case BulkActionEditType.set_tags:
      return [
        {
          type: editAction,
          value: [],
        },
      ];

    case BulkActionEditType.set_timeline:
      return [
        {
          type: editAction,
          value: { timeline_id: '', timeline_title: '' },
        },
      ];
  }
};
