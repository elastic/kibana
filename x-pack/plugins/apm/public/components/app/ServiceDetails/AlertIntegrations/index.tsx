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
  {
    defaultMessage: 'Alerts',
  }
);

const createThresholdAlertLabel = i18n.translate(
  'xpack.apm.serviceDetails.alertsMenu.createThresholdAlert',
  {
    defaultMessage: 'Create threshold alert',
  }
);

const CREATE_THRESHOLD_ALERT_PANEL_ID = 'create_threshold';

interface Props {
  canReadAlerts: boolean;
  canSaveAlerts: boolean;
}

export function AlertIntegrations(props: Props) {
  const { canSaveAlerts, canReadAlerts } = props;

  const plugin = useApmPluginContext();

  const [popoverOpen, setPopoverOpen] = useState(false);

  const [alertType, setAlertType] = useState<AlertType | null>(null);

  const button = (
    <EuiButtonEmpty
      iconType="arrowDown"
      iconSide="right"
      onClick={() => setPopoverOpen(true)}
    >
      {i18n.translate('xpack.apm.serviceDetails.alertsMenu.alerts', {
        defaultMessage: 'Alerts',
      })}
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
                name: createThresholdAlertLabel,
                panel: CREATE_THRESHOLD_ALERT_PANEL_ID,
                icon: 'bell',
              },
            ]
          : []),
        ...(canReadAlerts
          ? [
              {
                name: i18n.translate(
                  'xpack.apm.serviceDetails.alertsMenu.viewActiveAlerts',
                  {
                    defaultMessage: 'View active alerts',
                  }
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
      id: CREATE_THRESHOLD_ALERT_PANEL_ID,
      title: createThresholdAlertLabel,
      items: [
        {
          name: i18n.translate(
            'xpack.apm.serviceDetails.alertsMenu.transactionDuration',
            {
              defaultMessage: 'Transaction duration',
            }
          ),
          onClick: () => {
            setAlertType(AlertType.TransactionDuration);
          },
        },
        {
          name: i18n.translate(
            'xpack.apm.serviceDetails.alertsMenu.errorRate',
            {
              defaultMessage: 'Error rate',
            }
          ),
          onClick: () => {
            setAlertType(AlertType.ErrorRate);
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
