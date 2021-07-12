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
import { FormattedMessage } from '@kbn/i18n/react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { PrefilledInventoryAlertFlyout } from '../../inventory/components/alert_flyout';
import { PrefilledThresholdAlertFlyout } from '../../metric_threshold/components/alert_flyout';
import { useLinkProps } from '../../../hooks/use_link_props';

type VisibleFlyoutType = 'inventory' | 'threshold' | null;

export const MetricsAlertDropdown = () => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [visibleFlyoutType, setVisibleFlyoutType] = useState<VisibleFlyoutType>(null);
  const uiCapabilities = useKibana().services.application?.capabilities;

  const canCreateAlerts = useMemo(() => Boolean(uiCapabilities?.infrastructure?.save), [
    uiCapabilities,
  ]);

  const closeFlyout = useCallback(() => setVisibleFlyoutType(null), [setVisibleFlyoutType]);

  const infrastructureAlertsPanel = useMemo(
    () => ({
      id: 1,
      title: i18n.translate('xpack.infra.alerting.infrastructureDropdownTitle', {
        defaultMessage: 'Infrastructure rules',
      }),
      items: [
        {
          name: i18n.translate('xpack.infra.alerting.createInventoryRuleButton', {
            defaultMessage: 'Create inventory rule',
          }),
          onClick: () => setVisibleFlyoutType('inventory'),
        },
      ],
    }),
    [setVisibleFlyoutType]
  );

  const metricsAlertsPanel = useMemo(
    () => ({
      id: 2,
      title: i18n.translate('xpack.infra.alerting.metricsDropdownTitle', {
        defaultMessage: 'Metrics rules',
      }),
      items: [
        {
          name: i18n.translate('xpack.infra.alerting.createThresholdRuleButton', {
            defaultMessage: 'Create threshold rule',
          }),
          onClick: () => setVisibleFlyoutType('threshold'),
        },
      ],
    }),
    [setVisibleFlyoutType]
  );

  const manageAlertsLinkProps = useLinkProps({
    app: 'management',
    pathname: '/insightsAndAlerting/triggersActions/alerts',
  });

  const manageAlertsMenuItem = useMemo(
    () => ({
      name: i18n.translate('xpack.infra.alerting.manageRules', {
        defaultMessage: 'Manage rules',
      }),
      icon: 'tableOfContents',
      onClick: manageAlertsLinkProps.onClick,
    }),
    [manageAlertsLinkProps]
  );

  const firstPanelMenuItems: EuiContextMenuPanelDescriptor['items'] = useMemo(
    () =>
      canCreateAlerts
        ? [
            {
              name: i18n.translate('xpack.infra.alerting.infrastructureDropdownMenu', {
                defaultMessage: 'Infrastructure',
              }),
              panel: 1,
            },
            {
              name: i18n.translate('xpack.infra.alerting.metricsDropdownMenu', {
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
          title: i18n.translate('xpack.infra.alerting.alertDropdownTitle', {
            defaultMessage: 'Alerts and rules',
          }),
          items: firstPanelMenuItems,
        },
      ].concat(canCreateAlerts ? [infrastructureAlertsPanel, metricsAlertsPanel] : []),
    [infrastructureAlertsPanel, metricsAlertsPanel, firstPanelMenuItems, canCreateAlerts]
  );

  const closePopover = useCallback(() => {
    setPopoverOpen(false);
  }, [setPopoverOpen]);

  const openPopover = useCallback(() => {
    setPopoverOpen(true);
  }, [setPopoverOpen]);

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
            onClick={openPopover}
          >
            <FormattedMessage
              id="xpack.infra.alerting.alertsButton"
              defaultMessage="Alerts and rules"
            />
          </EuiHeaderLink>
        }
        isOpen={popoverOpen}
        closePopover={closePopover}
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
      <AlertFlyout visibleFlyoutType={visibleFlyoutType} onClose={closeFlyout} />
    </>
  );
};

interface AlertFlyoutProps {
  visibleFlyoutType: VisibleFlyoutType;
  onClose(): void;
}

const AlertFlyout = ({ visibleFlyoutType, onClose }: AlertFlyoutProps) => {
  switch (visibleFlyoutType) {
    case 'inventory':
      return <PrefilledInventoryAlertFlyout onClose={onClose} />;
    case 'threshold':
      return <PrefilledThresholdAlertFlyout onClose={onClose} />;
    default:
      return null;
  }
};
