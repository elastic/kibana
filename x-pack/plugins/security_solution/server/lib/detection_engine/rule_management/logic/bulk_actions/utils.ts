/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BulkActionEditType } from '../../../../../../common/detection_engine/rule_management';

/**
 * helper utility that defines whether bulk edit action is related to index patterns, i.e. one of:
 * 'add_index_patterns', 'delete_index_patterns', 'set_index_patterns'
 * @param editAction {@link BulkActionEditType}
 * @returns {boolean}
 */
export const isIndexPatternsBulkEditAction = (editAction: BulkActionEditType) =>
  [
    BulkActionEditType.add_index_patterns,
    BulkActionEditType.delete_index_patterns,
    BulkActionEditType.set_index_patterns,
  ].includes(editAction);
