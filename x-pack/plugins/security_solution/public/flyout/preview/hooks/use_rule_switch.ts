/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useHasActionsPrivileges } from '../../../detection_engine/rule_management_ui/components/rules_table/use_has_actions_privileges';
import { useHasMlPermissions } from '../../../detection_engine/rule_management_ui/components/rules_table/use_has_ml_permissions';
import { isMlRule } from '../../../../common/machine_learning/helpers';
import { useUserData } from '../../../detections/components/user_info';
import {
  canEditRuleWithActions,
  explainLackOfPermission,
  hasUserCRUDPermission,
} from '../../../common/utils/privileges';
import type { Rule } from '../../../detection_engine/rule_management/logic';
export interface UseRuleSwitchParams {
  /**
   * Rule object that represents relevant information about a rule
   */
  rule: Rule | null;
  /**
   * Boolean that indicates whether the rule currently exists
   */
  isExistingRule: boolean;
}

export interface UseRuleSwitchResult {
  /**
   * Boolean of wheather useUserData is loading
   */
  userInfoLoading: boolean;
  /**
   * Tooltip text that explains why a user does not have permission to rule
   */
  tooltipText?: string;
  /**
   * Boolean that indivates whether the rule switch button is isabled
   */
  isButtonDisabled: boolean;
  /**
   * Boolean that indivates whether the rule switch shoud be enabled
   */
  isRuleEnabled: boolean;
}

/**
 * This hook is used to retrieved data for rule switch
 * @param rule data
 * @param isExistingrule is this rule an existing rule
 */
export const useRuleSwitch = ({
  rule,
  isExistingRule,
}: UseRuleSwitchParams): UseRuleSwitchResult => {
  const hasMlPermissions = useHasMlPermissions();
  const hasActionsPrivileges = useHasActionsPrivileges();
  const [{ loading: userInfoLoading, canUserCRUD }] = useUserData();

  const tooltipText = explainLackOfPermission(
    rule,
    hasMlPermissions,
    hasActionsPrivileges,
    canUserCRUD
  );

  return {
    userInfoLoading,
    tooltipText,
    isButtonDisabled:
      !isExistingRule ||
      !canEditRuleWithActions(rule, hasActionsPrivileges) ||
      !hasUserCRUDPermission(canUserCRUD) ||
      (isMlRule(rule?.type) && !hasMlPermissions),
    isRuleEnabled: isExistingRule && (rule?.enabled ?? false),
  };
};
