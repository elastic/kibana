/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiButtonEmpty, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { euiStyled } from '../../../../../../src/plugins/kibana_react/common';
import { SettingsPageFieldErrors } from '../../pages/settings';

export interface SettingsActionsProps {
  isFormDisabled: boolean;
  isFormDirty: boolean;
  isFormValid: boolean;
  onApply: (event: React.FormEvent) => void;
  onCancel: () => void;
  errors: SettingsPageFieldErrors | null;
}

export const SettingsActions = ({
  isFormDisabled,
  isFormDirty,
  isFormValid,
  onApply,
  onCancel,
  errors,
}: SettingsActionsProps) => {
  const { heartbeatIndices, invalidEmail, expirationThresholdError, ageThresholdError } =
    errors ?? {};

  const { to, cc, bcc } = invalidEmail ?? {};

  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem>
        <WarningText>
          {heartbeatIndices || to || cc || bcc || expirationThresholdError || ageThresholdError}
        </WarningText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          color="ghost"
          size="s"
          iconType="cross"
          data-test-subj="discardSettingsButton"
          isDisabled={!isFormDirty || isFormDisabled}
          onClick={() => {
            onCancel();
          }}
        >
          <FormattedMessage
            id="xpack.uptime.sourceConfiguration.discardSettingsButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          data-test-subj="apply-settings-button"
          onClick={onApply}
          color="primary"
          isDisabled={!isFormDirty || !isFormValid || isFormDisabled}
          fill
        >
          <FormattedMessage
            id="xpack.uptime.sourceConfiguration.applySettingsButtonLabel"
            defaultMessage="Apply changes"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const WarningText = euiStyled(EuiText)`
    box-shadow: -4px 0 ${(props) => props.theme.eui.euiColorWarning};
    padding-left: 8px;
`;
