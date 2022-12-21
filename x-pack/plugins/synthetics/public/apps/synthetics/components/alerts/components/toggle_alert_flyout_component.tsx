/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiHeaderLink,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
  EuiLink,
  EuiPopover,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SYNTHETICS_ALERT_RULE_TYPES } from '../../../../../../common/constants/synthetics_alerts';
import { ClientPluginsStart } from '../../../../../plugin';
import { ToggleFlyoutTranslations } from './translations';

interface ComponentProps {
  setAlertFlyoutVisible: (value: boolean) => void;
  setAlertFlyoutType: (value: string) => void;
}

const ALERT_CONTEXT_MAIN_PANEL_ID = 0;

const noWritePermissionsTooltipContent = i18n.translate(
  'xpack.synthetics.alertDropdown.noWritePermissions',
  {
    defaultMessage: 'You need read-write access to Uptime to create alerts in this app.',
  }
);

export const ToggleAlertFlyoutButtonComponent: React.FC<ComponentProps> = ({
  setAlertFlyoutType,
  setAlertFlyoutVisible,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const kibana = useKibana();
  const {
    services: { observability },
  } = useKibana<ClientPluginsStart>();

  const manageRulesUrl = observability.useRulesLink();
  const hasUptimeWrite = kibana.services.application?.capabilities.uptime?.save ?? false;

  const monitorStatusAlertContextMenuItem: EuiContextMenuPanelItemDescriptor = {
    'aria-label': ToggleFlyoutTranslations.toggleMonitorStatusAriaLabel,
    'data-test-subj': 'xpack.synthetics.toggleAlertFlyout',
    name: ToggleFlyoutTranslations.toggleMonitorStatusContent,
    onClick: () => {
      setAlertFlyoutType(SYNTHETICS_ALERT_RULE_TYPES.MONITOR_STATUS);
      setAlertFlyoutVisible(true);
      setIsOpen(false);
    },
    toolTipContent: !hasUptimeWrite ? noWritePermissionsTooltipContent : null,
    disabled: !hasUptimeWrite,
    icon: 'bell',
  };

  const managementContextItem: EuiContextMenuPanelItemDescriptor = {
    'aria-label': ToggleFlyoutTranslations.navigateToAlertingUIAriaLabel,
    'data-test-subj': 'xpack.synthetics.navigateToAlertingUi',
    name: (
      <EuiLink color="text" href={manageRulesUrl.href}>
        <FormattedMessage
          id="xpack.synthetics.navigateToAlertingButton.content"
          defaultMessage="Manage rules"
        />
      </EuiLink>
    ),
    icon: 'tableOfContents',
  };

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: ALERT_CONTEXT_MAIN_PANEL_ID,
      items: [monitorStatusAlertContextMenuItem, managementContextItem],
    },
  ];

  return (
    <EuiPopover
      button={
        <EuiHeaderLink
          color="text"
          aria-label={ToggleFlyoutTranslations.toggleButtonAriaLabel}
          data-test-subj="xpack.synthetics.alertsPopover.toggleButton"
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsOpen(!isOpen)}
        >
          <FormattedMessage
            id="xpack.synthetics.alerts.toggleAlertFlyoutButtonText"
            defaultMessage="Alerts and rules"
          />
        </EuiHeaderLink>
      }
      closePopover={() => setIsOpen(false)}
      isOpen={isOpen}
      ownFocus
      panelPaddingSize="none"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
