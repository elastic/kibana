/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useAddPrebuiltRulesTableContext } from './add_prebuilt_rules_table_context';
import { RuleDetailsFlyout } from '../../../../rule_management/components/rule_details/rule_details_flyout';
import * as i18n from './translations';

export const AddPrebuiltRulesFlyout = () => {
  const {
    state: { flyoutRule, isFlyoutInstallButtonDisabled },
    actions: { installOneRule, closeFlyout },
  } = useAddPrebuiltRulesTableContext();

  if (flyoutRule == null) {
    return null;
  }

  return (
    <RuleDetailsFlyout
      rule={flyoutRule}
      actionButtonLabel={i18n.INSTALL_BUTTON_LABEL}
      isActionButtonDisabled={isFlyoutInstallButtonDisabled}
      onActionButtonClick={installOneRule}
      closeFlyout={closeFlyout}
    />
  );
};
