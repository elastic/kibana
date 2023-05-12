/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlyout,
  EuiFlyoutBody,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { RuleAdHocRunner } from '../../../../../components/rules/rule_ad_hoc_runner';
import type { Rule } from '../../../../../../detection_engine/rule_management/logic';

// import * as ruleI18n from '../../translations';

interface ShowAdHocRunnerFlyoutButtonProps {
  rule: Rule | null;
  disabled: boolean;
  disabledReason?: string;
}

export function ShowAdHocRunnerFlyoutButton({
  rule,
  disabled = false,
  disabledReason,
}: ShowAdHocRunnerFlyoutButtonProps): JSX.Element | null {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const adHocRunnerlyoutTitleId = useGeneratedHtmlId({
    prefix: 'adHocRunner',
  });

  let flyout;

  if (isFlyoutVisible && rule) {
    flyout = (
      <EuiFlyout
        ownFocus
        onClose={() => setIsFlyoutVisible(false)}
        aria-labelledby={adHocRunnerlyoutTitleId}
      >
        <EuiFlyoutBody>
          <RuleAdHocRunner rule={rule} />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  if (!rule) {
    return null;
  }

  return (
    <>
      <EuiToolTip position="top" content={disabledReason}>
        <EuiButton
          data-test-subj="showAdHocRunnerFlyoutButton"
          color="primary"
          onClick={() => setIsFlyoutVisible(true)}
        >
          {'Execute rule'}
          <EuiButtonIcon
            iconType="doubleArrowRight"
            aria-label={'Run rule'}
            isDisabled={disabled}
          />
        </EuiButton>
      </EuiToolTip>
      {flyout}
    </>
  );
}
