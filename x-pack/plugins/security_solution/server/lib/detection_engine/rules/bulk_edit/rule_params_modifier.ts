/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAlertType } from '../types';

import {
  BulkActionEditPayload,
  BulkActionEditType,
} from '../../../../../common/detection_engine/schemas/common/schemas';

import { invariant } from '../../../../../common/utils/invariant';

export const addItemsToArray = <T>(arr: T[], items: T[]): T[] =>
  Array.from(new Set([...arr, ...items]));

export const deleteItemsFromArray = <T>(arr: T[], items: T[]): T[] => {
  const itemsSet = new Set(items);
  return arr.filter((item) => !itemsSet.has(item));
};

const applyBulkActionEditToRuleParams = (
  existingRuleParams: RuleAlertType['params'],
  action: BulkActionEditPayload
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

      ruleParams.index = addItemsToArray(ruleParams.index ?? [], action.value);
      break;

    case BulkActionEditType.delete_index_patterns:
      invariant(
        ruleParams.type !== 'machine_learning',
        "Index patterns can't be deleted. Machine learning rule doesn't have index patterns property"
      );

      ruleParams.index = deleteItemsFromArray(ruleParams.index ?? [], action.value);
      break;

    case BulkActionEditType.set_index_patterns:
      invariant(
        ruleParams.type !== 'machine_learning',
        "Index patterns can't be overwritten. Machine learning rule doesn't have index patterns property"
      );

      ruleParams.index = action.value;
      break;

    // timeline actions
    case BulkActionEditType.set_timeline:
      ruleParams = {
        ...ruleParams,
        timelineId: action.value.timeline_id,
        timelineTitle: action.value.timeline_title,
      };
      break;
  }

  return ruleParams;
};

export const ruleParamsModifier = (
  existingRuleParams: RuleAlertType['params'],
  actions: BulkActionEditPayload[]
) => {
  return actions.reduce(
    (acc, action) => ({ ...acc, ...applyBulkActionEditToRuleParams(acc, action) }),
    existingRuleParams
  );
};
