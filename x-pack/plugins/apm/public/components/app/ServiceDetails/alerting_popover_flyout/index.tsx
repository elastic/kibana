/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { AlertType } from '../../../../../common/alert_types';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';
import { AlertingFlyout } from '../../../alerting/AlertingFlyout';

const alertLabel = i18n.translate(
  'xpack.apm.serviceDetails.alertsMenu.alerts',
  { defaultMessage: 'Alerts' }
);
const transactionDurationLabel = i18n.translate(
  'xpack.apm.serviceDetails.alertsMenu.transactionDuration',
  { defaultMessage: 'Transaction duration' }
);
const transactionErrorRateLabel = i18n.translate(
  'xpack.apm.serviceDetails.alertsMenu.transactionErrorRate',
  { defaultMessage: 'Transaction error rate' }
);
const errorCountLabel = i18n.translate(
  'xpack.apm.serviceDetails.alertsMenu.errorCount',
  { defaultMessage: 'Error count' }
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
  'create_transaction_duration_panel';
const CREATE_TRANSACTION_ERROR_RATE_ALERT_PANEL_ID =
  'create_transaction_error_rate_panel';
const CREATE_ERROR_COUNT_ALERT_PANEL_ID = 'create_error_count_panel';

interface Props {
  canReadAlerts: boolean;
  canSaveAlerts: boolean;
  canReadAnomalies: boolean;
}

export function AlertingPopoverAndFlyout(props: Props) {
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
              {
                name: transactionErrorRateLabel,
                panel: CREATE_TRANSACTION_ERROR_RATE_ALERT_PANEL_ID,
              },
              {
                name: errorCountLabel,
                panel: CREATE_ERROR_COUNT_ALERT_PANEL_ID,
              },
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

    // transaction duration panel
    {
      id: CREATE_TRANSACTION_DURATION_ALERT_PANEL_ID,
      title: transactionDurationLabel,
      items: [
        // threshold alerts
        {
          name: createThresholdAlertLabel,
          onClick: () => {
            setAlertType(AlertType.TransactionDuration);
            setPopoverOpen(false);
          },
        },

        // anomaly alerts
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

    // transaction error rate panel
    {
      id: CREATE_TRANSACTION_ERROR_RATE_ALERT_PANEL_ID,
      title: transactionErrorRateLabel,
      items: [
        // threshold alerts
        {
          name: createThresholdAlertLabel,
          onClick: () => {
            setAlertType(AlertType.TransactionErrorRate);
            setPopoverOpen(false);
          },
        },
      ],
    },

    // error alerts panel
    {
      id: CREATE_ERROR_COUNT_ALERT_PANEL_ID,
      title: errorCountLabel,
      items: [
        {
          name: createThresholdAlertLabel,
          onClick: () => {
            setAlertType(AlertType.ErrorCount);
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
