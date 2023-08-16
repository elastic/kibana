/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useUpgradePrebuiltRulesTableContext } from './upgrade_prebuilt_rules_table_context';
import { RuleDetailsFlyout } from '../../../../rule_management/components/rule_details/rule_details_flyout';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema/rule_schemas';
import { diffableRuleToRuleResponse } from '../../../../../../common/detection_engine/diffable_rule_to_rule_response';
import * as i18n from './translations';

export const UpgradePrebuiltRulesFlyout = () => {
  const {
    state: { flyoutRule, isFlyoutInstallButtonDisabled },
    actions: { upgradeOneRule, closeFlyout },
  } = useUpgradePrebuiltRulesTableContext();

  if (flyoutRule == null) {
    return null;
  }

  const ruleResponse: Partial<RuleResponse> = diffableRuleToRuleResponse(flyoutRule);

  return (
    <RuleDetailsFlyout
      rule={ruleResponse}
      actionButtonLabel={i18n.UPDATE_BUTTON_LABEL}
      isActionButtonDisabled={isFlyoutInstallButtonDisabled}
      onActionButtonClick={upgradeOneRule}
      closeFlyout={closeFlyout}
    />
  );
};
