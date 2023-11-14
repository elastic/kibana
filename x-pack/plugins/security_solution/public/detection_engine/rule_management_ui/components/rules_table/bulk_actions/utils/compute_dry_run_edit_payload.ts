/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkActionEditPayload,
  BulkActionEditType,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { BulkActionEditTypeEnum } from '../../../../../../../common/api/detection_engine/rule_management';
import { assertUnreachable } from '../../../../../../../common/utility_types';

/**
 * helper utility that creates payload for _bulk_action API in dry mode
 * @param {BulkAction} action
 * @param {BulkActionEditType | undefined} editAction
 * @returns {BulkActionEditPayload[] | undefined}
 */
export function computeDryRunEditPayload(editAction: BulkActionEditType): BulkActionEditPayload[] {
  switch (editAction) {
    case BulkActionEditTypeEnum.add_index_patterns:
    case BulkActionEditTypeEnum.delete_index_patterns:
    case BulkActionEditTypeEnum.set_index_patterns:
      return [
        {
          type: editAction,
          value: [],
        },
      ];

    case BulkActionEditTypeEnum.add_tags:
    case BulkActionEditTypeEnum.delete_tags:
    case BulkActionEditTypeEnum.set_tags:
      return [
        {
          type: editAction,
          value: [],
        },
      ];

    case BulkActionEditTypeEnum.set_timeline:
      return [
        {
          type: editAction,
          value: { timeline_id: '', timeline_title: '' },
        },
      ];

    case BulkActionEditTypeEnum.add_rule_actions:
    case BulkActionEditTypeEnum.set_rule_actions:
      return [
        {
          type: editAction,
          value: { actions: [] },
        },
      ];
    case BulkActionEditTypeEnum.set_schedule:
      return [
        {
          type: editAction,
          value: { interval: '5m', lookback: '1m' },
        },
      ];

    default:
      assertUnreachable(editAction);
  }

  return [
    {
      type: editAction,
      value: [],
    },
  ];
}
