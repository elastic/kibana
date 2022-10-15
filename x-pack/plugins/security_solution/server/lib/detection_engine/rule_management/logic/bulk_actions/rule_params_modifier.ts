/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import moment from 'moment';
import { parseInterval } from '@kbn/data-plugin/common/search/aggs/utils/date_interval_utils';
import type { RuleAlertType } from '../../../rule_schema';
import type { BulkActionEditForRuleParams } from '../../../../../../common/detection_engine/rule_management';
import { BulkActionEditType } from '../../../../../../common/detection_engine/rule_management';
import { invariant } from '../../../../../../common/utils/invariant';

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

    // update look-back period in from and meta.from fields
    case BulkActionEditType.set_schedule: {
      const interval = parseInterval(action.value.interval) ?? moment.duration(0);
      const parsedFrom = parseInterval(action.value.lookback) ?? moment.duration(0);

      const from = parsedFrom.asSeconds() + interval.asSeconds();

      ruleParams = {
        ...ruleParams,
        meta: {
          ...ruleParams.meta,
          from: action.value.lookback,
        },
        from: `now-${from}s`,
      };
    }
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
