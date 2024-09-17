/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderLink,
  EuiLoadingSpinner,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../../../common/constants/synthetics_alerts';
import { ManageRulesLink } from '../common/links/manage_rules_link';
import { ClientPluginsStart } from '../../../../plugin';
import { ToggleFlyoutTranslations } from './hooks/translations';
import { useSyntheticsRules } from './hooks/use_synthetics_rules';
import {
  selectAlertFlyoutVisibility,
  selectMonitorListState,
  setAlertFlyoutVisible,
} from '../../state';

export const ToggleAlertFlyoutButton = () => {
  const dispatch = useDispatch();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { application } = useKibana<ClientPluginsStart>().services;
  const hasUptimeWrite = application?.capabilities.uptime?.save ?? false;

  const { EditAlertFlyout, loading } = useSyntheticsRules(isOpen);

  const { loaded, data: monitors } = useSelector(selectMonitorListState);

  const hasMonitors = loaded && monitors.absoluteTotal && monitors.absoluteTotal > 0;

  const monitorStatusAlertContextMenuItem: EuiContextMenuPanelItemDescriptor = {
    'aria-label': ToggleFlyoutTranslations.toggleMonitorStatusAriaLabel,
    'data-test-subj': 'xpack.synthetics.toggleAlertFlyout',
    name: (
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>{ToggleFlyoutTranslations.toggleMonitorStatusContent}</EuiFlexItem>
        {loading && (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ),
    onClick: () => {
      dispatch(setAlertFlyoutVisible(SYNTHETICS_STATUS_RULE));
      setIsOpen(false);
    },
    toolTipContent: !hasUptimeWrite ? noWritePermissionsTooltipContent : null,
    disabled: !hasUptimeWrite || loading,
    icon: 'bell',
  };

  const tlsAlertContextMenuItem: EuiContextMenuPanelItemDescriptor = {
    'aria-label': ToggleFlyoutTranslations.toggleMonitorStatusAriaLabel,
    'data-test-subj': 'xpack.synthetics.toggleAlertFlyout.tls',
    name: (
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>{ToggleFlyoutTranslations.toggleTlsContent}</EuiFlexItem>
        {loading && (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ),
    onClick: () => {
      dispatch(setAlertFlyoutVisible(SYNTHETICS_TLS_RULE));
      setIsOpen(false);
    },
    toolTipContent: !hasUptimeWrite ? noWritePermissionsTooltipContent : null,
    disabled: !hasUptimeWrite || loading,
    icon: 'bell',
  };

  const managementContextItem: EuiContextMenuPanelItemDescriptor = {
    'aria-label': ToggleFlyoutTranslations.navigateToAlertingUIAriaLabel,
    'data-test-subj': 'xpack.synthetics.navigateToAlertingUi',
    name: <ManageRulesLink />,
    icon: 'tableOfContents',
  };

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      items: [monitorStatusAlertContextMenuItem, tlsAlertContextMenuItem, managementContextItem],
    },
  ];

  const alertFlyoutVisible = useSelector(selectAlertFlyoutVisibility);

  return (
    <>
      <EuiPopover
        button={
          <EuiHeaderLink
            color="text"
            aria-label={ToggleFlyoutTranslations.toggleButtonAriaLabel}
            data-test-subj="xpack.synthetics.alertsPopover.toggleButton"
            iconType="arrowDown"
            iconSide="right"
            onClick={() => setIsOpen(!isOpen)}
            disabled={!hasMonitors}
          >
            {ToggleFlyoutTranslations.alertsAndRules}
          </EuiHeaderLink>
        }
        closePopover={() => setIsOpen(false)}
        isOpen={isOpen}
        ownFocus
        panelPaddingSize="none"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
      {alertFlyoutVisible && EditAlertFlyout}
    </>
  );
};

const noWritePermissionsTooltipContent = i18n.translate(
  'xpack.synthetics.alertDropdown.noPermissions',
  {
    defaultMessage: 'You do not have sufficient permissions to perform this action.',
  }
);
