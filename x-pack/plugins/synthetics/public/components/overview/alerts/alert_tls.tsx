/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiExpression, EuiFlexItem, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { TlsTranslations } from './translations';
import { SettingsMessageExpressionPopover } from './settings_message_expression_popover';

interface Props {
  ageThreshold?: number;
  expirationThreshold?: number;
  setAlertFlyoutVisible: (value: boolean) => void;
}

export const AlertTlsComponent: React.FC<Props> = (props) => (
  <>
    <EuiSpacer size="l" />
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <EuiExpression
          aria-label={TlsTranslations.criteriaAriaLabel}
          color="success"
          description={TlsTranslations.criteriaDescription}
          value={TlsTranslations.criteriaValue}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <SettingsMessageExpressionPopover
          aria-label={TlsTranslations.expirationAriaLabel}
          id="expiration"
          description={TlsTranslations.expirationDescription}
          value={TlsTranslations.expirationValue(props.expirationThreshold)}
          {...props}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <SettingsMessageExpressionPopover
          aria-label={TlsTranslations.ageAriaLabel}
          id="age"
          description={TlsTranslations.ageDescription}
          value={TlsTranslations.ageValue(props.ageThreshold)}
          {...props}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="l" />
  </>
);
