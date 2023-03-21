/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '../../../detection_engine/rule_management/logic';
import * as i18nActions from '../../../detections/pages/detection_engine/rules/translations';
import { isMlRule } from '../../../../common/machine_learning/helpers';
import * as detectionI18n from '../../../detections/pages/detection_engine/translations';

export const isBoolean = (obj: unknown): obj is boolean => typeof obj === 'boolean';

export const canEditRuleWithActions = (
  rule: Rule | null | undefined,
  privileges:
    | boolean
    | Readonly<{
        [x: string]: boolean;
      }>
): boolean => {
  if (rule == null) {
    return true;
  }
  if (rule.actions?.length > 0 && isBoolean(privileges)) {
    return privileges;
  }
  return true;
};

// typed as null not undefined as the initial state for this value is null.
export const hasUserCRUDPermission = (canUserCRUD: boolean | null): boolean =>
  canUserCRUD != null ? canUserCRUD : true;

export const explainLackOfPermission = (
  rule: Rule | null | undefined,
  hasMlPermissions: boolean,
  hasReadActionsPrivileges:
    | boolean
    | Readonly<{
        [x: string]: boolean;
      }>,
  canUserCRUD: boolean | null
): string | undefined => {
  if (rule == null) {
    return undefined;
  } else if (isMlRule(rule.type) && !hasMlPermissions) {
    return detectionI18n.ML_RULES_DISABLED_MESSAGE;
  } else if (!canEditRuleWithActions(rule, hasReadActionsPrivileges)) {
    return i18nActions.LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES;
  } else if (!hasUserCRUDPermission(canUserCRUD)) {
    return i18nActions.LACK_OF_KIBANA_SECURITY_PRIVILEGES;
  } else {
    return undefined;
  }
};
