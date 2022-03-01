/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiHeaderLink,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { IBasePath } from '../../../../../../../src/core/public';
import { AlertType } from '../../../../common/alert_types';
import { AlertingFlyout } from '../../alerting/alerting_flyout';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

const alertLabel = i18n.translate('xpack.apm.home.alertsMenu.alerts', {
  defaultMessage: 'Alerts and rules',
});
const transactionDurationLabel = i18n.translate(
  'xpack.apm.home.alertsMenu.transactionDuration',
  { defaultMessage: 'Latency' }
);
const transactionErrorRateLabel = i18n.translate(
  'xpack.apm.home.alertsMenu.transactionErrorRate',
  { defaultMessage: 'Failed transaction rate' }
);
const errorCountLabel = i18n.translate('xpack.apm.home.alertsMenu.errorCount', {
  defaultMessage: 'Error count',
});
const createThresholdAlertLabel = i18n.translate(
  'xpack.apm.home.alertsMenu.createThresholdAlert',
  { defaultMessage: 'Create threshold rule' }
);
const createAnomalyAlertAlertLabel = i18n.translate(
  'xpack.apm.home.alertsMenu.createAnomalyAlert',
  { defaultMessage: 'Create anomaly rule' }
);

const CREATE_TRANSACTION_DURATION_ALERT_PANEL_ID =
  'create_transaction_duration_panel';
const CREATE_TRANSACTION_ERROR_RATE_ALERT_PANEL_ID =
  'create_transaction_error_rate_panel';
const CREATE_ERROR_COUNT_ALERT_PANEL_ID = 'create_error_count_panel';

interface Props {
  basePath: IBasePath;
  canReadAlerts: boolean;
  canSaveAlerts: boolean;
  canReadAnomalies: boolean;
  includeTransactionDuration: boolean;
}

export function AlertingPopoverAndFlyout({
  basePath,
  canSaveAlerts,
  canReadAlerts,
  canReadAnomalies,
  includeTransactionDuration,
}: Props) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [alertType, setAlertType] = useState<AlertType | null>(null);
  const {
    plugins: { observability },
  } = useApmPluginContext();
  const button = (
    <EuiHeaderLink
      color="text"
      iconType="arrowDown"
      iconSide="right"
      onClick={() => setPopoverOpen((prevState) => !prevState)}
    >
      {alertLabel}
    </EuiHeaderLink>
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
                  'xpack.apm.home.alertsMenu.viewActiveAlerts',
                  { defaultMessage: 'Manage rules' }
                ),
                href: observability.useRulesLink().href,
                icon: 'tableOfContents',
              },
            ]
          : []),
      ],
    },

    // latency panel
    {
      id: CREATE_TRANSACTION_DURATION_ALERT_PANEL_ID,
      title: transactionDurationLabel,
      items: [
        // threshold alerts
        ...(includeTransactionDuration
          ? [
              {
                name: createThresholdAlertLabel,
                onClick: () => {
                  setAlertType(AlertType.TransactionDuration);
                  setPopoverOpen(false);
                },
              },
            ]
          : []),

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

    // Failed transactions panel
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
