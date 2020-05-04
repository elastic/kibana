/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Link } from 'react-router-dom';
import { EuiExpression, EuiFlexItem, EuiFlexGroup, EuiPopover, EuiSpacer } from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { TlsTranslations } from './translations';
import { SETTINGS_ROUTE } from '../../../../common/constants';

interface SettingsMessageExpressionPopoverProps {
  'aria-label': string;
  description: string;
  id: string;
  setAlertFlyoutVisible: (value: boolean) => void;
  value: string;
}

const SettingsMessageExpressionPopover: React.FC<SettingsMessageExpressionPopoverProps> = ({
  'aria-label': ariaLabel,
  description,
  setAlertFlyoutVisible,
  value,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <EuiPopover
      id={id}
      anchorPosition="downLeft"
      button={
        <EuiExpression
          aria-label={ariaLabel}
          color="secondary"
          description={description}
          isActive={isOpen}
          onClick={() => setIsOpen(!isOpen)}
          value={value}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
    >
      <FormattedMessage
        id="xpack.uptime.alerts.tls.settingsPageNav.text"
        defaultMessage="You can edit these thresholds on the {settingsPageLink}."
        values={{
          settingsPageLink: (
            // this link is wrapped around a span so we can also change the UI state
            // and hide the alert flyout before triggering the navigation to the settings page
            <Link to={SETTINGS_ROUTE} data-test-subj="xpack.uptime.alerts.tlsFlyout.linkToSettings">
              <span
                onClick={() => {
                  setAlertFlyoutVisible(false);
                }}
                onKeyUp={e => {
                  if (e.key === 'Enter') {
                    setAlertFlyoutVisible(false);
                  }
                }}
              >
                settings page
              </span>
            </Link>
          ),
        }}
      />
    </EuiPopover>
  );
};

interface Props {
  ageThreshold?: number;
  expirationThreshold?: number;
  setAlertFlyoutVisible: (value: boolean) => void;
}

export const AlertTlsComponent: React.FC<Props> = props => (
  <>
    <EuiSpacer size="l" />
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <EuiExpression
          aria-label={TlsTranslations.criteriaAriaLabel}
          color="secondary"
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
