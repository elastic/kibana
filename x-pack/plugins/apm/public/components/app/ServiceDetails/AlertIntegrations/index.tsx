/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiPopover,
  EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { AlertType } from '../../../../../common/alert_types';
import { AlertingFlyout } from './AlertingFlyout';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';

const alertLabel = i18n.translate(
  'xpack.apm.serviceDetails.alertsMenu.alerts',
  { defaultMessage: 'Alerts' }
);
const transactionDurationLabel = i18n.translate(
  'xpack.apm.serviceDetails.alertsMenu.transactionDuration',
  { defaultMessage: 'Transaction duration' }
);
const errorRateLabel = i18n.translate(
  'xpack.apm.serviceDetails.alertsMenu.errorRate',
  { defaultMessage: 'Error rate' }
);
const createThresholdAlertLabel = i18n.translate(
  'xpack.apm.serviceDetails.alertsMenu.createThresholdAlert',
  { defaultMessage: 'Create threshold alert' }
);
const createAnomalyAlertAlertLabel = i18n.translate(
  'xpack.apm.serviceDetails.alertsMenu.createAnomalyAlert',
  { defaultMessage: 'Create anomaly alert' }
);

const CREATE_TRANSACTION_DURATION_ALERT_PANEL_ID =
  'create_transaction_duration';
const CREATE_ERROR_RATE_ALERT_PANEL_ID = 'create_error_rate';

interface Props {
  canReadAlerts: boolean;
  canSaveAlerts: boolean;
  canReadAnomalies: boolean;
}

export function AlertIntegrations(props: Props) {
  const { canSaveAlerts, canReadAlerts, canReadAnomalies } = props;

  const plugin = useApmPluginContext();

  const [popoverOpen, setPopoverOpen] = useState(false);

  const [alertType, setAlertType] = useState<AlertType | null>(null);

  const button = (
    <EuiButtonEmpty
      iconType="arrowDown"
      iconSide="right"
      onClick={() => setPopoverOpen(true)}
    >
      {alertLabel}
    </EuiButtonEmpty>
  );

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: alertLabel,
      items: [
        ...(canSaveAlerts
          ? [
              {
                name: transactionDurationLabel,
                panel: CREATE_TRANSACTION_DURATION_ALERT_PANEL_ID,
              },
              { name: errorRateLabel, panel: CREATE_ERROR_RATE_ALERT_PANEL_ID },
            ]
          : []),
        ...(canReadAlerts
          ? [
              {
                name: i18n.translate(
                  'xpack.apm.serviceDetails.alertsMenu.viewActiveAlerts',
                  { defaultMessage: 'View active alerts' }
                ),
                href: plugin.core.http.basePath.prepend(
                  '/app/management/insightsAndAlerting/triggersActions/alerts'
                ),
                icon: 'tableOfContents',
              },
            ]
          : []),
      ],
    },
    {
      id: CREATE_TRANSACTION_DURATION_ALERT_PANEL_ID,
      title: transactionDurationLabel,
      items: [
        {
          name: createThresholdAlertLabel,
          onClick: () => {
            setAlertType(AlertType.TransactionDuration);
            setPopoverOpen(false);
          },
        },
        ...(canReadAnomalies
          ? [
              {
                name: createAnomalyAlertAlertLabel,
                onClick: () => {
                  setAlertType(AlertType.TransactionDurationAnomaly);
                  setPopoverOpen(false);
                },
              },
            ]
          : []),
      ],
    },
    {
      id: CREATE_ERROR_RATE_ALERT_PANEL_ID,
      title: errorRateLabel,
      items: [
        {
          name: createThresholdAlertLabel,
          onClick: () => {
            setAlertType(AlertType.ErrorRate);
            setPopoverOpen(false);
          },
        },
      ],
    },
  ];

  return (
    <>
      <EuiPopover
        id="integrations-menu"
        button={button}
        isOpen={popoverOpen}
        closePopover={() => setPopoverOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downRight"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
      <AlertingFlyout
        alertType={alertType}
        addFlyoutVisible={!!alertType}
        setAddFlyoutVisibility={(visible) => {
          if (!visible) {
            setAlertType(null);
          }
        }}
      />
    </>
  );
}
