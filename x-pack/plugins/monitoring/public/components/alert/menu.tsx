/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiContextMenu,
  EuiTextColor,
  EuiPopover,
  EuiBadge,
  EuiFlexGrid,
  EuiFlexItem,
  EuiNotificationBadge,
} from '@elastic/eui';
import { CommonAlertStatus } from '../../../common/types';
import { AlertSeverity } from '../../../common/enums';
import { AlertState } from '../../../server/alerts/types';
import { AlertPopoverStatus } from './status';

interface AlertMenuProps {
  alerts: { [alertTypeId: string]: CommonAlertStatus };
}
export const AlertMenu: React.FC<AlertMenuProps> = (props: AlertMenuProps) => {
  const { alerts } = props;
  const [showPopover, setShowPopover] = React.useState(false);

  const counts = {
    [AlertSeverity.Danger]: 0,
    [AlertSeverity.Warning]: 0,
    [AlertSeverity.Success]: 0,
  };

  for (const alert of Object.values(alerts)) {
    for (const alertState of alert.states) {
      const state = alertState.state as AlertState;
      counts[state.ui.severity] += 1;
    }
  }

  const notificationBadges = (
    <Fragment>
      {counts[AlertSeverity.Danger] > 0 ? (
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge key="danger">{counts[AlertSeverity.Danger]}</EuiNotificationBadge>
        </EuiFlexItem>
      ) : null}
      {counts[AlertSeverity.Warning] > 0 ? (
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge key="warning">{counts[AlertSeverity.Warning]}</EuiNotificationBadge>
        </EuiFlexItem>
      ) : null}
    </Fragment>
  );

  const button = (
    <EuiBadge
      iconType="alert"
      onClickAriaLabel="View alerts"
      iconOnClickAriaLabel="View alerts"
      iconOnClick={() => setShowPopover(true)}
      onClick={() => setShowPopover(true)}
    >
      <EuiFlexGrid>
        <EuiFlexItem grow={false}>View alerts</EuiFlexItem>
        {notificationBadges}
      </EuiFlexGrid>
    </EuiBadge>
  );

  const panels = [
    {
      id: 0,
      title: 'Alert status',
      items: Object.keys(alerts).map((alertTypeId, index) => {
        const alert = alerts[alertTypeId].alert;
        const severity = alerts[alertTypeId].states[0].state.ui.severity;
        return {
          name: <EuiTextColor color={severity}>{alert.label}</EuiTextColor>,
          panel: index + 1,
        };
      }),
    },
    ...Object.keys(alerts).map((alertTypeId, index) => {
      const alertStatus = alerts[alertTypeId];
      const alert = alertStatus.alert;
      return {
        id: index + 1,
        title: alert.label,
        width: 400,
        content: (
          <div style={{ padding: '1rem' }}>
            <AlertPopoverStatus alert={alertStatus} />
          </div>
        ),
      };
    }),
  ];

  return (
    <EuiPopover
      id="monitoringAlertMenu"
      button={button}
      isOpen={showPopover}
      closePopover={() => setShowPopover(false)}
      panelPaddingSize="none"
      withTitle
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
      {/* <EuiContextMenuPanel items={items} /> */}
    </EuiPopover>
  );
};
