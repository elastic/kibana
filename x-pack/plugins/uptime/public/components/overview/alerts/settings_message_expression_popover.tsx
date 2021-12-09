/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { EuiExpression, EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

interface SettingsMessageExpressionPopoverProps {
  'aria-label': string;
  description: string;
  id: string;
  setAlertFlyoutVisible: (value: boolean) => void;
  value: string;
}

export const SettingsMessageExpressionPopover: React.FC<SettingsMessageExpressionPopoverProps> = ({
  'aria-label': ariaLabel,
  description,
  setAlertFlyoutVisible,
  value,
  id,
}) => {
  const kibana = useKibana();
  const path = kibana.services?.application?.getUrlForApp('uptime', { path: 'settings' });
  const [isOpen, setIsOpen] = useState(false);
  return (
    <EuiPopover
      data-test-subj={`xpack.uptime.alerts.tls.expressionPopover.${id}`}
      id={id}
      anchorPosition="downLeft"
      button={
        <EuiExpression
          aria-label={ariaLabel}
          color="success"
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
            <EuiLink href={path} data-test-subj="xpack.uptime.alerts.tlsFlyout.linkToSettings">
              <span
                onClick={() => {
                  setAlertFlyoutVisible(false);
                }}
                onKeyUp={(e) => {
                  if (e.key === 'Enter') {
                    setAlertFlyoutVisible(false);
                  }
                }}
              >
                settings page
              </span>
            </EuiLink>
          ),
        }}
      />
    </EuiPopover>
  );
};
