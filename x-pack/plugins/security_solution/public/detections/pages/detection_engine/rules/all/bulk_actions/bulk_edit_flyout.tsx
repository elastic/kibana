/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  BulkActionEditType,
  BulkActionEditPayload,
} from '../../../../../../../common/detection_engine/schemas/common/schemas';

import { IndexPatternsForm } from './forms/index_patterns_form';
import { TagsForm } from './forms/tags_form';

interface BulkEditFlyoutProps {
  onClose: () => void;
  onConfirm: (bulkActionEditPayload: BulkActionEditPayload) => void;
  editAction: BulkActionEditType;
  rulesCount: number;
  tags: string[];
}

const BulkEditFlyoutComponent = ({ editAction, tags, ...props }: BulkEditFlyoutProps) => {
  switch (editAction) {
    case BulkActionEditType.add_index_patterns:
    case BulkActionEditType.delete_index_patterns:
    case BulkActionEditType.set_index_patterns:
      return <IndexPatternsForm {...props} editAction={editAction} />;

    case BulkActionEditType.add_tags:
    case BulkActionEditType.delete_tags:
    case BulkActionEditType.set_tags:
      return <TagsForm {...props} editAction={editAction} tags={tags} />;

    default:
      return null;
  }
};

export const BulkEditFlyout = React.memo(BulkEditFlyoutComponent);

BulkEditFlyout.displayName = 'BulkEditFlyout';
