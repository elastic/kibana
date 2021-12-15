/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAlertType } from './types';

import {
  BulkActionUpdatePayload,
  BulkActionUpdateType,
} from '../../../../common/detection_engine/schemas/common/schemas';

export const addItemsToArray = <T>(arr: T[], items: T[]): T[] =>
  Array.from(new Set([...arr, ...items]));

export const deleteItemsFromArray = <T>(arr: T[], items: T[]): T[] => {
  const itemsSet = new Set(items);
  return arr.filter((item) => !itemsSet.has(item));
};

export const appplyBulkActionUpdateToRule = (
  existingRule: RuleAlertType,
  action: BulkActionUpdatePayload
): RuleAlertType => {
  const rule = { ...existingRule, params: { ...existingRule.params } };
  switch (action.type) {
    // tags actions
    case BulkActionUpdateType.add_tags:
      rule.tags = addItemsToArray(rule.tags ?? [], action.value);
      break;

    case BulkActionUpdateType.delete_tags:
      rule.tags = deleteItemsFromArray(rule.tags ?? [], action.value);
      break;

    case BulkActionUpdateType.set_tags:
      rule.tags = action.value;
      break;

    // index actions
    case BulkActionUpdateType.add_index_patterns:
      if (rule.params && 'index' in rule.params) {
        rule.params.index = addItemsToArray(rule.params.index ?? [], action.value);
      }
      break;

    case BulkActionUpdateType.delete_index_patterns:
      if (rule.params && 'index' in rule.params) {
        rule.params.index = deleteItemsFromArray(rule.params.index ?? [], action.value);
      }
      break;

    case BulkActionUpdateType.set_index_patterns:
      if (rule.params && 'index' in rule.params) {
        rule.params.index = action.value;
      }
      break;

    // timeline actions
    case BulkActionUpdateType.set_timeline:
      if (rule.params) {
        rule.params.timelineId = action.value.timeline_id;
        rule.params.timelineTitle = action.value.timeline_title;
      }
  }

  return rule;
};
