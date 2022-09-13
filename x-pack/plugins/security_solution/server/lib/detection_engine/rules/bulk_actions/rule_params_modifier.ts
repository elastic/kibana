/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAlertType } from '../types';

import type { BulkActionEditForRuleParams } from '../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import { BulkActionEditType } from '../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';

import { invariant } from '../../../../../common/utils/invariant';

export const addItemsToArray = <T>(arr: T[], items: T[]): T[] =>
  Array.from(new Set([...arr, ...items]));

export const deleteItemsFromArray = <T>(arr: T[], items: T[]): T[] => {
  const itemsSet = new Set(items);
  return arr.filter((item) => !itemsSet.has(item));
};

const applyBulkActionEditToRuleParams = (
  existingRuleParams: RuleAlertType['params'],
  action: BulkActionEditForRuleParams
): RuleAlertType['params'] => {
  let ruleParams = { ...existingRuleParams };

  switch (action.type) {
    // index_patterns actions
    // index pattern is not present in machine learning rule type, so we throw error on it
    case BulkActionEditType.add_index_patterns:
      invariant(
        ruleParams.type !== 'machine_learning',
        "Index patterns can't be added. Machine learning rule doesn't have index patterns property"
      );

      if (ruleParams.dataViewId != null && !action.overwrite_data_views) {
        break;
      }

      if (action.overwrite_data_views) {
        ruleParams.dataViewId = undefined;
      }

      ruleParams.index = addItemsToArray(ruleParams.index ?? [], action.value);
      break;

    case BulkActionEditType.delete_index_patterns:
      invariant(
        ruleParams.type !== 'machine_learning',
        "Index patterns can't be deleted. Machine learning rule doesn't have index patterns property"
      );

      if (ruleParams.dataViewId != null && !action.overwrite_data_views) {
        break;
      }

      if (action.overwrite_data_views) {
        ruleParams.dataViewId = undefined;
      }

      if (ruleParams.index) {
        ruleParams.index = deleteItemsFromArray(ruleParams.index, action.value);
      }
      break;

    case BulkActionEditType.set_index_patterns:
      invariant(
        ruleParams.type !== 'machine_learning',
        "Index patterns can't be overwritten. Machine learning rule doesn't have index patterns property"
      );

      if (ruleParams.dataViewId != null && !action.overwrite_data_views) {
        break;
      }

      if (action.overwrite_data_views) {
        ruleParams.dataViewId = undefined;
      }

      ruleParams.index = action.value;
      break;

    // timeline actions
    case BulkActionEditType.set_timeline:
      ruleParams = {
        ...ruleParams,
        timelineId: action.value.timeline_id || undefined,
        timelineTitle: action.value.timeline_title || undefined,
      };
      break;
  }

  return ruleParams;
};

/**
 * takes list of bulkEdit actions and apply them to rule.params by mutating it
 * @param existingRuleParams
 * @param actions
 * @returns mutated params
 */
export const ruleParamsModifier = (
  existingRuleParams: RuleAlertType['params'],
  actions: BulkActionEditForRuleParams[]
) => {
  const modifiedParams = actions.reduce(
    (acc, action) => ({ ...acc, ...applyBulkActionEditToRuleParams(acc, action) }),
    existingRuleParams
  );

  // increment version even if actions are empty, as attributes can be modified as well outside of ruleParamsModifier
  // version must not be modified for immutable rule. Otherwise prebuilt rules upgrade flow will be broken
  if (existingRuleParams.immutable === false) {
    modifiedParams.version += 1;
  }

  return modifiedParams;
};
