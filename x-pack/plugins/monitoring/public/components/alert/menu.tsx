/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiContextMenu,
  EuiTextColor,
  EuiPopover,
  EuiBadge,
  EuiFlexGrid,
  EuiFlexItem,
  EuiText,
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
  const [showPopover, setShowPopover] = React.useState<AlertSeverity | null>(null);

  const byType = {
    [AlertSeverity.Danger]: [] as CommonAlertStatus[],
    [AlertSeverity.Warning]: [] as CommonAlertStatus[],
    [AlertSeverity.Success]: [] as CommonAlertStatus[],
  };

  for (const alert of Object.values(alerts)) {
    for (const alertState of alert.states) {
      const state = alertState.state as AlertState;
      byType[state.ui.severity].push(alert);
    }
  }

  const badges = [];
  const typesToShow = [AlertSeverity.Danger, AlertSeverity.Warning];
  for (const type of typesToShow) {
    const list = byType[type];
    if (list.length === 0) {
      continue;
    }

    const button = (
      <EuiBadge
        iconType="alert"
        color={type}
        onClickAriaLabel={`${list.length} ${type}(s)`}
        onClick={() => setShowPopover(type)}
      >
        {list.length} {type}(s)
      </EuiBadge>
    );

    const panels = [
      {
        id: 0,
        title: `${list.length} ${type} alert(s)`,
        items: list.map(({ alert, states }, index) => {
          const severity = states[0].state.ui.severity;
          return {
            name: (
              <EuiTextColor color={severity}>
                <EuiText size="s">{alert.label}</EuiText>
              </EuiTextColor>
            ),
            panel: index + 1,
          };
        }),
      },
      ...list.map((alertStatus, index) => {
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

    badges.push(
      <EuiPopover
        id="monitoringAlertMenu"
        button={button}
        isOpen={showPopover === type}
        closePopover={() => setShowPopover(null)}
        panelPaddingSize="none"
        withTitle
        anchorPosition="downLeft"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
        {/* <EuiContextMenuPanel items={items} /> */}
      </EuiPopover>
    );
  }

  return (
    <EuiFlexGrid>
      {badges.map((badge, index) => (
        <EuiFlexItem key={index} grow={false}>
          {badge}
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
};
