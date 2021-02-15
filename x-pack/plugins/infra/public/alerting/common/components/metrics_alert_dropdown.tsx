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
  EuiButtonEmpty,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useInfraMLCapabilities } from '../../../containers/ml/infra_ml_capabilities';
import { PrefilledInventoryAlertFlyout } from '../../inventory/components/alert_flyout';
import { PrefilledThresholdAlertFlyout } from '../../metric_threshold/components/alert_flyout';
import { PrefilledAnomalyAlertFlyout } from '../../metric_anomaly/components/alert_flyout';
import { useLinkProps } from '../../../hooks/use_link_props';

type VisibleFlyoutType = 'inventory' | 'threshold' | 'anomaly' | null;

export const MetricsAlertDropdown = () => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [visibleFlyoutType, setVisibleFlyoutType] = useState<VisibleFlyoutType>(null);
  const { hasInfraMLCapabilities } = useInfraMLCapabilities();

  const closeFlyout = useCallback(() => setVisibleFlyoutType(null), [setVisibleFlyoutType]);

  const manageAlertsLinkProps = useLinkProps({
    app: 'management',
    pathname: '/insightsAndAlerting/triggersActions/alerts',
  });

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: 0,
        title: i18n.translate('xpack.infra.alerting.alertDropdownTitle', {
          defaultMessage: 'Alerts',
        }),
        items: [
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
          {
            name: i18n.translate('xpack.infra.alerting.manageAlerts', {
              defaultMessage: 'Manage alerts',
            }),
            icon: 'tableOfContents',
            onClick: manageAlertsLinkProps.onClick,
          },
        ],
      },
      {
        id: 1,
        title: i18n.translate('xpack.infra.alerting.infrastructureDropdownTitle', {
          defaultMessage: 'Infrastructure alerts',
        }),
        items: [
          {
            name: i18n.translate('xpack.infra.alerting.createInventoryAlertButton', {
              defaultMessage: 'Create inventory alert',
            }),
            onClick: () => setVisibleFlyoutType('inventory'),
          },
        ].concat(
          hasInfraMLCapabilities
            ? {
                name: i18n.translate('xpack.infra.alerting.createAnomalyAlertButton', {
                  defaultMessage: 'Create anomaly alert',
                }),
                onClick: () => setVisibleFlyoutType('anomaly'),
              }
            : []
        ),
      },
      {
        id: 2,
        title: i18n.translate('xpack.infra.alerting.metricsDropdownTitle', {
          defaultMessage: 'Metrics alerts',
        }),
        items: [
          {
            name: i18n.translate('xpack.infra.alerting.createThresholdAlertButton', {
              defaultMessage: 'Create threshold alert',
            }),
            onClick: () => setVisibleFlyoutType('threshold'),
          },
        ],
      },
    ],
    [manageAlertsLinkProps, setVisibleFlyoutType, hasInfraMLCapabilities]
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
          <EuiButtonEmpty iconSide={'right'} iconType={'arrowDown'} onClick={openPopover}>
            <FormattedMessage id="xpack.infra.alerting.alertsButton" defaultMessage="Alerts" />
          </EuiButtonEmpty>
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
    case 'anomaly':
      return <PrefilledAnomalyAlertFlyout onClose={onClose} />;
    default:
      return null;
  }
};
