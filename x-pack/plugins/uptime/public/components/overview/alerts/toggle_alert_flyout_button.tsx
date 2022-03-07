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
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { CLIENT_ALERT_TYPES } from '../../../../common/constants/alerts';
import { ClientPluginsStart } from '../../../../public/apps/plugin';

import { ToggleFlyoutTranslations } from './translations';
import { ToggleAlertFlyoutButtonProps } from './alerts_containers';

interface ComponentProps {
  setAlertFlyoutVisible: (value: boolean | string) => void;
}

type Props = ComponentProps & ToggleAlertFlyoutButtonProps;

const ALERT_CONTEXT_MAIN_PANEL_ID = 0;
const ALERT_CONTEXT_SELECT_TYPE_PANEL_ID = 1;

const noWritePermissionsTooltipContent = i18n.translate(
  'xpack.uptime.alertDropdown.noWritePermissions',
  {
    defaultMessage: 'You need read-write access to Uptime to create alerts in this app.',
  }
);

export const ToggleAlertFlyoutButtonComponent: React.FC<Props> = ({
  alertOptions,
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
    'data-test-subj': 'xpack.uptime.toggleAlertFlyout',
    name: ToggleFlyoutTranslations.toggleMonitorStatusContent,
    onClick: () => {
      setAlertFlyoutVisible(CLIENT_ALERT_TYPES.MONITOR_STATUS);
      setIsOpen(false);
    },
  };

  const tlsAlertContextMenuItem: EuiContextMenuPanelItemDescriptor = {
    'aria-label': ToggleFlyoutTranslations.toggleTlsAriaLabel,
    'data-test-subj': 'xpack.uptime.toggleTlsAlertFlyout',
    name: ToggleFlyoutTranslations.toggleTlsContent,
    onClick: () => {
      setAlertFlyoutVisible(CLIENT_ALERT_TYPES.TLS);
      setIsOpen(false);
    },
  };

  const managementContextItem: EuiContextMenuPanelItemDescriptor = {
    'aria-label': ToggleFlyoutTranslations.navigateToAlertingUIAriaLabel,
    'data-test-subj': 'xpack.uptime.navigateToAlertingUi',
    name: (
      <EuiLink color="text" href={manageRulesUrl.href}>
        <FormattedMessage
          id="xpack.uptime.navigateToAlertingButton.content"
          defaultMessage="Manage rules"
        />
      </EuiLink>
    ),
    icon: 'tableOfContents',
  };

  let selectionItems: EuiContextMenuPanelItemDescriptor[] = [];
  if (!alertOptions) {
    selectionItems = [monitorStatusAlertContextMenuItem, tlsAlertContextMenuItem];
  } else {
    alertOptions.forEach((option) => {
      if (option === CLIENT_ALERT_TYPES.MONITOR_STATUS)
        selectionItems.push(monitorStatusAlertContextMenuItem);
      else if (option === CLIENT_ALERT_TYPES.TLS) selectionItems.push(tlsAlertContextMenuItem);
    });
  }

  if (selectionItems.length === 1) {
    selectionItems[0].icon = 'bell';
  }

  let panels: EuiContextMenuPanelDescriptor[];
  if (selectionItems.length === 1) {
    panels = [
      {
        id: ALERT_CONTEXT_MAIN_PANEL_ID,
        items: [...selectionItems, managementContextItem],
      },
    ];
  } else {
    panels = [
      {
        id: ALERT_CONTEXT_MAIN_PANEL_ID,
        items: [
          {
            'aria-label': ToggleFlyoutTranslations.openAlertContextPanelAriaLabel,
            'data-test-subj': 'xpack.uptime.openAlertContextPanel',
            name: ToggleFlyoutTranslations.openAlertContextPanelLabel,
            icon: 'bell',
            panel: ALERT_CONTEXT_SELECT_TYPE_PANEL_ID,
            toolTipContent: !hasUptimeWrite ? noWritePermissionsTooltipContent : null,
            disabled: !hasUptimeWrite,
          },
          managementContextItem,
        ],
      },
      {
        id: ALERT_CONTEXT_SELECT_TYPE_PANEL_ID,
        title: ToggleFlyoutTranslations.toggleAlertFlyoutButtonLabel,
        items: selectionItems,
      },
    ];
  }

  return (
    <EuiPopover
      button={
        <EuiHeaderLink
          color="text"
          aria-label={ToggleFlyoutTranslations.toggleButtonAriaLabel}
          data-test-subj="xpack.uptime.alertsPopover.toggleButton"
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsOpen(!isOpen)}
        >
          <FormattedMessage
            id="xpack.uptime.alerts.toggleAlertFlyoutButtonText"
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
