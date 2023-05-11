/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
// import * as ruleI18n from '../../translations';

interface ShowAdHocRunnerFlyoutButtonProps {
  ruleId: string;
  disabled: boolean;
  disabledReason?: string;
}

export function ShowAdHocRunnerFlyoutButton({
  ruleId,
  disabled = false,
  disabledReason,
}: ShowAdHocRunnerFlyoutButtonProps): JSX.Element {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const simpleFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'simpleFlyoutTitle',
  });

  let flyout;

  const htmlCode = `<div id="adHocRunner">
    <p>Run the rule with the following parameters:</p>
    <p>Rule ID: ${ruleId}</p>
    <p>Rule name: ${ruleId}</p>
    <p>Rule type: ${ruleId}</p>
  </div>
  `;

  if (isFlyoutVisible) {
    flyout = (
      <EuiFlyout
        ownFocus
        onClose={() => setIsFlyoutVisible(false)}
        aria-labelledby={simpleFlyoutTitleId}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={simpleFlyoutTitleId}>{'Execute the rule'}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiCodeBlock language="html">{htmlCode}</EuiCodeBlock>
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  return (
    <>
      <EuiToolTip position="top" content={disabledReason}>
        <EuiButtonIcon
          data-test-subj="showAdHocRunnerFlyoutButton"
          color="primary"
          onClick={() => setIsFlyoutVisible(true)}
          iconType="refresh"
          aria-label={'Run rule'}
          isDisabled={disabled}
        />
      </EuiToolTip>
      {flyout}
    </>
  );
}
