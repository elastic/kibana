/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiPopover,
  EuiHeaderLink,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { InfraClientStartDeps } from '../types';
import { PrefilledThresholdAlertFlyout } from './alert_flyout';

type VisibleFlyoutType = 'inventory' | 'threshold' | null;

export function MetricsAlertDropdown() {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [visibleFlyoutType, setVisibleFlyoutType] = useState<VisibleFlyoutType>(null);
  const uiCapabilities = useKibana().services.application?.capabilities;
  const {
    services: { observability },
  } = useKibana<InfraClientStartDeps>();
  const canCreateAlerts = useMemo(
    () => Boolean(uiCapabilities?.infrastructure?.save),
    [uiCapabilities]
  );

  const closeFlyout = useCallback(() => setVisibleFlyoutType(null), [setVisibleFlyoutType]);

  const closePopover = useCallback(() => {
    setPopoverOpen(false);
  }, [setPopoverOpen]);

  const togglePopover = useCallback(() => {
    setPopoverOpen(!popoverOpen);
  }, [setPopoverOpen, popoverOpen]);
  const infrastructureAlertsPanel = useMemo(
    () => ({
      id: 1,
      title: i18n.translate('xpack.observability.threshold.rule.infrastructureDropdownTitle', {
        defaultMessage: 'Infrastructure rules',
      }),
      items: [
        {
          'data-test-subj': 'inventory-alerts-create-rule',
          name: i18n.translate('xpack.observability.threshold.rule.createInventoryRuleButton', {
            defaultMessage: 'Create inventory rule',
          }),
          onClick: () => {
            closePopover();
            setVisibleFlyoutType('inventory');
          },
        },
      ],
    }),
    [setVisibleFlyoutType, closePopover]
  );

  const metricsAlertsPanel = useMemo(
    () => ({
      id: 2,
      title: i18n.translate('xpack.observability.threshold.rule.metricsDropdownTitle', {
        defaultMessage: 'Metrics rules',
      }),
      items: [
        {
          'data-test-subj': 'metrics-threshold-alerts-create-rule',
          name: i18n.translate('xpack.observability.threshold.rule.createThresholdRuleButton', {
            defaultMessage: 'Create threshold rule',
          }),
          onClick: () => {
            closePopover();
            setVisibleFlyoutType('threshold');
          },
        },
      ],
    }),
    [setVisibleFlyoutType, closePopover]
  );

  const manageRulesLinkProps = observability.useRulesLink();

  const manageAlertsMenuItem = useMemo(
    () => ({
      name: i18n.translate('xpack.observability.threshold.rule.manageRules', {
        defaultMessage: 'Manage rules',
      }),
      icon: 'tableOfContents',
      onClick: manageRulesLinkProps.onClick,
    }),
    [manageRulesLinkProps]
  );

  const firstPanelMenuItems: EuiContextMenuPanelDescriptor['items'] = useMemo(
    () =>
      canCreateAlerts
        ? [
            {
              'data-test-subj': 'inventory-alerts-menu-option',
              name: i18n.translate(
                'xpack.observability.threshold.rule.infrastructureDropdownMenu',
                {
                  defaultMessage: 'Infrastructure',
                }
              ),
              panel: 1,
            },
            {
              'data-test-subj': 'metrics-threshold-alerts-menu-option',
              name: i18n.translate('xpack.observability.threshold.rule.metricsDropdownMenu', {
                defaultMessage: 'Metrics',
              }),
              panel: 2,
            },
            manageAlertsMenuItem,
          ]
        : [manageAlertsMenuItem],
    [canCreateAlerts, manageAlertsMenuItem]
  );

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () =>
      [
        {
          id: 0,
          title: i18n.translate('xpack.observability.threshold.rule.alertDropdownTitle', {
            defaultMessage: 'Alerts and rules',
          }),
          items: firstPanelMenuItems,
        },
      ].concat(canCreateAlerts ? [infrastructureAlertsPanel, metricsAlertsPanel] : []),
    [infrastructureAlertsPanel, metricsAlertsPanel, firstPanelMenuItems, canCreateAlerts]
  );
  return (
    <>
      <EuiPopover
        panelPaddingSize="none"
        anchorPosition="downLeft"
        button={
          <EuiHeaderLink
            color="text"
            iconSide={'right'}
            iconType={'arrowDown'}
            onClick={togglePopover}
            data-test-subj="thresholdRuleStructure-alerts-and-rules"
          >
            <FormattedMessage
              id="xpack.observability.threshold.rule.alertsButton"
              defaultMessage="Alerts and rules"
            />
          </EuiHeaderLink>
        }
        isOpen={popoverOpen}
        closePopover={closePopover}
      >
        <EuiContextMenu initialPanelId={0} panels={panels} data-test-subj="metrics-alert-menu" />
      </EuiPopover>
      <AlertFlyout visibleFlyoutType={visibleFlyoutType} onClose={closeFlyout} />
    </>
  );
}

interface AlertFlyoutProps {
  visibleFlyoutType: VisibleFlyoutType;
  onClose(): void;
}

function AlertFlyout({ visibleFlyoutType, onClose }: AlertFlyoutProps) {
  switch (visibleFlyoutType) {
    case 'threshold':
      return <PrefilledThresholdAlertFlyout onClose={onClose} />;
    default:
      return null;
  }
}
