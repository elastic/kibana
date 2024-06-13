/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, type FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiToolTip, copyToClipboard, type EuiButtonProps } from '@elastic/eui';

interface CopyToClipboardButtonProps
  extends Omit<EuiButtonProps, 'onBlur' | 'onMouseLeave' | 'onClick' | 'iconType'> {
  text?: string;
}
export const CopyToClipboardButton: FunctionComponent<CopyToClipboardButtonProps> = ({
  text,
  children,
  ...rest
}) => {
  const [isTextCopied, setTextCopied] = useState(false);

  return (
    <EuiToolTip
      content={
        isTextCopied
          ? i18n.translate(
              'xpack.observability_onboarding.autoDetectPanel.copiedToClipboardTooltip',
              {
                defaultMessage: 'Copied',
              }
            )
          : null
      }
    >
      <EuiButton
        data-test-subj="observabilityOnboardingCopyToClipboardButton"
        iconType="copyClipboard"
        onBlur={() => setTextCopied(false)}
        onMouseLeave={() => setTextCopied(false)}
        onClick={() => {
          if (text) {
            copyToClipboard(text);
            setTextCopied(true);
          }
        }}
        isDisabled={!text}
        {...rest}
      >
        {children ??
          i18n.translate('xpack.observability_onboarding.copyToClipboardButtonLabel', {
            defaultMessage: 'Copy to clipboard',
          })}
      </EuiButton>
    </EuiToolTip>
  );
};
