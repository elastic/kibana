/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiLink,
  EuiPopover,
} from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { CLIENT_ALERT_TYPES } from '../../../../common/constants';
import { ToggleFlyoutTranslations } from './translations';

interface Props {
  setAlertFlyoutVisible: (value: boolean | string) => void;
}

const ALERT_CONTEXT_MAIN_PANEL_ID = 0;
const ALERT_CONTEXT_SELECT_TYPE_PANEL_ID = 1;

export const ToggleAlertFlyoutButtonComponent = ({ setAlertFlyoutVisible }: Props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const kibana = useKibana();
  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: ALERT_CONTEXT_MAIN_PANEL_ID,
      title: 'main panel',
      items: [
        {
          'aria-label': ToggleFlyoutTranslations.openAlertContextPanelAriaLabel,
          'data-test-subj': 'xpack.uptime.openAlertContextPanel',
          name: ToggleFlyoutTranslations.openAlertContextPanelLabel,
          icon: 'bell',
          panel: 1,
        },
        {
          'aria-label': ToggleFlyoutTranslations.navigateToAlertingUIAriaLabel,
          'data-test-subj': 'xpack.uptime.navigateToAlertingUi',
          name: (
            <EuiLink
              color="text"
              href={kibana.services?.application?.getUrlForApp(
                'kibana#/management/kibana/triggersActions/alerts'
              )}
            >
              <FormattedMessage
                id="xpack.uptime.navigateToAlertingButton.content"
                defaultMessage="Manage alerts"
              />
            </EuiLink>
          ),
          icon: 'tableOfContents',
        },
      ],
    },
    {
      id: ALERT_CONTEXT_SELECT_TYPE_PANEL_ID,
      title: 'create alerts',
      items: [
        {
          'aria-label': ToggleFlyoutTranslations.toggleMonitorStatusAriaLabel,
          'data-test-subj': 'xpack.uptime.toggleAlertFlyout',
          name: ToggleFlyoutTranslations.toggleMonitorStatusContent,
          onClick: () => {
            setAlertFlyoutVisible(CLIENT_ALERT_TYPES.MONITOR_STATUS);
            setIsOpen(false);
          },
        },
        {
          'aria-label': ToggleFlyoutTranslations.toggleTlsAriaLabel,
          'data-test-subj': 'xpack.uptime.toggleTlsAlertFlyout',
          name: ToggleFlyoutTranslations.toggleTlsContent,
          onClick: () => {
            setAlertFlyoutVisible(CLIENT_ALERT_TYPES.TLS);
            setIsOpen(false);
          },
        },
      ],
    },
  ];

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          aria-label={ToggleFlyoutTranslations.toggleButtonAriaLabel}
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
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
