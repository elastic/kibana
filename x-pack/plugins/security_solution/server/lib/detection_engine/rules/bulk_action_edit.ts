/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAlertType } from './types';

import type { BulkActionEditPayload } from '../../../../common/detection_engine/schemas/common/schemas';
import { BulkActionEditType } from '../../../../common/detection_engine/schemas/common/schemas';

import { invariant } from '../../../../common/utils/invariant';
import { isMachineLearningParams } from '../signals/utils';

export const addItemsToArray = <T>(arr: T[], items: T[]): T[] =>
  Array.from(new Set([...arr, ...items]));

export const deleteItemsFromArray = <T>(arr: T[], items: T[]): T[] => {
  const itemsSet = new Set(items);
  return arr.filter((item) => !itemsSet.has(item));
};

export const applyBulkActionEditToRule = (
  existingRule: RuleAlertType,
  action: BulkActionEditPayload
): RuleAlertType => {
  const rule = { ...existingRule, params: { ...existingRule.params } };

  switch (action.type) {
    // tags actions
    case BulkActionEditType.add_tags:
      rule.tags = addItemsToArray(rule.tags ?? [], action.value);
      break;

    case BulkActionEditType.delete_tags:
      rule.tags = deleteItemsFromArray(rule.tags ?? [], action.value);
      break;

    case BulkActionEditType.set_tags:
      rule.tags = action.value;
      break;

    // index_patterns actions
    // index pattern is not present in machine learning rule type, so we throw error on it
    case BulkActionEditType.add_index_patterns:
      invariant(
        rule.params.type !== 'machine_learning',
        "Index patterns can't be added. Machine learning rule doesn't have index patterns property"
      );

      if (!isMachineLearningParams(rule.params) && action.overwriteDataViews) {
        rule.params.dataViewId = undefined;
      }
      rule.params.index = addItemsToArray(rule.params.index ?? [], action.value);

      break;

    case BulkActionEditType.delete_index_patterns:
      invariant(
        rule.params.type !== 'machine_learning',
        "Index patterns can't be deleted. Machine learning rule doesn't have index patterns property"
      );

      if (!isMachineLearningParams(rule.params) && action.overwriteDataViews) {
        rule.params.dataViewId = undefined;
      }
      rule.params.index = deleteItemsFromArray(rule.params.index ?? [], action.value);

      invariant(
        rule.params.index.length !== 0,
        "Can't delete all index patterns. At least one index pattern must be left"
      );

      break;

    case BulkActionEditType.set_index_patterns:
      invariant(
        rule.params.type !== 'machine_learning',
        "Index patterns can't be overwritten. Machine learning rule doesn't have index patterns property"
      );
      invariant(action.value.length !== 0, "Index patterns can't be overwritten with empty list");

      if (!isMachineLearningParams(rule.params) && action.overwriteDataViews) {
        rule.params.dataViewId = undefined;
      }
      rule.params.index = action.value;

      break;

    // timeline actions
    case BulkActionEditType.set_timeline:
      const timelineId = action.value.timeline_id.trim() || undefined;
      const timelineTitle = timelineId ? action.value.timeline_title : undefined;

      rule.params.timelineId = timelineId;
      rule.params.timelineTitle = timelineTitle;
      break;
  }

  return rule;
};
