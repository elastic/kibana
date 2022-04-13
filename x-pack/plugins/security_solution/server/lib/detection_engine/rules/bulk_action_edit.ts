/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkEditOperation } from '../../../../../alerting/server';

import { RuleAlertType } from './types';

import {
  BulkActionEditPayload,
  BulkActionEditType,
} from '../../../../common/detection_engine/schemas/common/schemas';

import { invariant } from '../../../../common/utils/invariant';

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

      rule.params.index = addItemsToArray(rule.params.index ?? [], action.value);
      break;

    case BulkActionEditType.delete_index_patterns:
      invariant(
        rule.params.type !== 'machine_learning',
        "Index patterns can't be deleted. Machine learning rule doesn't have index patterns property"
      );

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

export const applyBulkActionEditToRuleParams = (
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

export const splitBulkEditActions = (actions: BulkActionEditPayload[]) => {
  const splitActions: {
    ruleParamsModifierActions: BulkActionEditPayload[];
    rulesClientOperations: BulkActionEditPayload[];
  } = {
    ruleParamsModifierActions: [],
    rulesClientOperations: [],
  };

  return actions.reduce((acc, action) => {
    switch (action.type) {
      case BulkActionEditType.add_tags:
      case BulkActionEditType.set_tags:
      case BulkActionEditType.delete_tags:
        acc.rulesClientOperations.push(action);
        break;
      default:
        acc.ruleParamsModifierActions.push(action);
    }

    return acc;
  }, splitActions);
};

export const operationAdapterForRulesClient = (
  action: BulkActionEditPayload
): BulkEditOperation => {
  switch (action.type) {
    // tags actions
    case BulkActionEditType.add_tags:
      return {
        field: 'tags',
        operation: 'add',
        value: action.value,
      };

    case BulkActionEditType.delete_tags:
      return {
        field: 'tags',
        operation: 'delete',
        value: action.value,
      };

    case BulkActionEditType.set_tags:
      return {
        field: 'tags',
        operation: 'set',
        value: action.value,
      };
  }

  throw Error('No action match');
};
