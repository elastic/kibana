/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDuration } from '@kbn/alerting-plugin/common';
import { hasAllPrivilege } from '../../../../lib/capabilities';
import { Rule, RuleTableItem, RuleTypeIndex, TriggersActionsUiConfig } from '../../../../../types';

interface ConvertRulesToTableItemsOpts {
  rules: Rule[];
  ruleTypeIndex: RuleTypeIndex;
  canExecuteActions: boolean;
  config: TriggersActionsUiConfig;
}

export function convertRulesToTableItems(opts: ConvertRulesToTableItemsOpts): RuleTableItem[] {
  const { rules, ruleTypeIndex, canExecuteActions, config } = opts;
  const minimumDuration = config.minimumScheduleInterval
    ? parseDuration(config.minimumScheduleInterval.value)
    : 0;
  return rules.map((rule, index: number) => {
    return {
      ...rule,
      index,
      actionsCount: rule.actions.length,
      ruleType: ruleTypeIndex.get(rule.ruleTypeId)?.name ?? rule.ruleTypeId,
      isEditable:
        hasAllPrivilege(rule.consumer, ruleTypeIndex.get(rule.ruleTypeId)) &&
        (canExecuteActions || (!canExecuteActions && !rule.actions.length)),
      enabledInLicense: !!ruleTypeIndex.get(rule.ruleTypeId)?.enabledInLicense,
      showIntervalWarning: parseDuration(rule.schedule.interval) < minimumDuration,
    };
  });
}
