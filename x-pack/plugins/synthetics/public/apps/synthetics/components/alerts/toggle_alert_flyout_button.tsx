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
import { ManageRulesLink } from '../common/links/manage_rules_link';
import { ClientPluginsStart } from '../../../../plugin';
import { ToggleFlyoutTranslations } from './hooks/translations';
import { useSyntheticsAlert } from './hooks/use_synthetics_alert';
import { selectAlertFlyoutVisibility, setAlertFlyoutVisible } from '../../state';

export const ToggleAlertFlyoutButton = () => {
  const dispatch = useDispatch();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { application } = useKibana<ClientPluginsStart>().services;
  const hasUptimeWrite = application?.capabilities.uptime?.save ?? false;

  const { EditAlertFlyout, loading } = useSyntheticsAlert(isOpen);

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
      dispatch(setAlertFlyoutVisible(true));
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
      items: [monitorStatusAlertContextMenuItem, managementContextItem],
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
  'xpack.synthetics.alertDropdown.noWritePermissions',
  {
    defaultMessage: 'You need read-write access to Uptime to create alerts in this app.',
  }
);
