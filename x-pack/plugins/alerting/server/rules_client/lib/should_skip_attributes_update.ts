/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkEditSkipReason } from '@kbn/security-solution-plugin/common/detection_engine/rule_management/api/rules/bulk_actions/response_schema';
import { BulkEditOperation } from '../..';
import { RawRule } from '../../types';

export const shouldSkipAttributesUpdate = (
  editOperation: BulkEditOperation,
  attributes: RawRule,
  attributesUpdateSkipReasons: BulkEditSkipReason[]
) => {
  const { field, operation, value } = editOperation;
  switch (field) {
    case 'tags': {
      if (operation === 'add') {
        if (value.every((tag) => attributes.tags.includes(tag))) {
          attributesUpdateSkipReasons.push(BulkEditSkipReason.AddedTagAlreadyExists);
          return true;
        }
      }
      if (operation === 'delete') {
        if (value.every((tag) => !attributes.tags.includes(tag))) {
          attributesUpdateSkipReasons.push(BulkEditSkipReason.DeletedTagNonExistent);
          return true;
        }
      }
    }
  }
  return false;
};
