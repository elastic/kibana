/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

interface Props {
  setAlertFlyoutVisible: (value: boolean) => void;
}

export const ToggleAlertFlyoutButtonComponent = ({ setAlertFlyoutVisible }: Props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const kibana = useKibana();

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          aria-label={i18n.translate('xpack.uptime.alertsPopover.toggleButton.ariaLabel', {
            defaultMessage: 'Open alert context menu',
          })}
          data-test-subj="xpack.uptime.alertsPopover.toggleButton"
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsOpen(!isOpen)}
        >
          <FormattedMessage
            id="xpack.uptime.alerts.toggleAlertFlyoutButtonText"
            defaultMessage="Alerts"
          />
        </EuiButtonEmpty>
      }
      closePopover={() => setIsOpen(false)}
      isOpen={isOpen}
      ownFocus
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            aria-label={i18n.translate('xpack.uptime.toggleAlertFlyout.ariaLabel', {
              defaultMessage: 'Open add alert flyout',
            })}
            data-test-subj="xpack.uptime.toggleAlertFlyout"
            key="create-alert"
            icon="bell"
            onClick={() => {
              setAlertFlyoutVisible(true);
              setIsOpen(false);
            }}
          >
            <FormattedMessage
              id="xpack.uptime.toggleAlertButton.content"
              defaultMessage="Create alert"
            />
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            aria-label={i18n.translate('xpack.uptime.navigateToAlertingUi', {
              defaultMessage: 'Leave Uptime and go to Alerting Management page',
            })}
            data-test-subj="xpack.uptime.navigateToAlertingUi"
            icon="tableOfContents"
            key="navigate-to-alerting"
            href={kibana.services?.application?.getUrlForApp(
              'kibana#/management/kibana/triggersActions/alerts'
            )}
          >
            <FormattedMessage
              id="xpack.uptime.navigateToAlertingButton.content"
              defaultMessage="Manage alerts"
            />
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
