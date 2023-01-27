/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton } from '@elastic/eui';

export interface CreateRuleButtonProps {
  openFlyout: () => void;
}

export const CreateRuleButton = (props: CreateRuleButtonProps) => {
  const { openFlyout } = props;

  return (
    <EuiButton
      iconType="plusInCircle"
      key="create-rule"
      data-test-subj="createRuleButton"
      fill
      onClick={openFlyout}
    >
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.rulesList.addRuleButtonLabel"
        defaultMessage="Create rule"
      />
    </EuiButton>
  );
};
