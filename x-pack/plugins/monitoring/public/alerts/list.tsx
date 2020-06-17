/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiContextMenu,
  EuiPopover,
  EuiBadge,
  EuiFlexGrid,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { CommonAlertStatus, CommonAlertState } from '../../common/types';
import { AlertSeverity } from '../../common/enums';
// @ts-ignore
import { formatDateTimeLocal } from '../../common/formatting';
import { AlertState } from '../../server/alerts/types';
import { AlertStatus } from './status';
import { Legacy } from '../legacy_shims';

function getDateFromState(states: CommonAlertState[]) {
  const timestamp = states[0].state.ui.triggeredMS;
  const tz = Legacy.shims.uiSettings.get('dateFormat:tz');
  return formatDateTimeLocal(timestamp, false, tz === 'Browser' ? null : tz);
}

interface Props {
  alerts: { [alertTypeId: string]: CommonAlertStatus };
}
export const AlertsList: React.FC<Props> = (props: Props) => {
  const { alerts } = props;
  const [showPopover, setShowPopover] = React.useState<AlertSeverity | null>(null);

  const byType = {
    [AlertSeverity.Danger]: [] as CommonAlertStatus[],
    [AlertSeverity.Warning]: [] as CommonAlertStatus[],
    [AlertSeverity.Success]: [] as CommonAlertStatus[],
  };

  for (const alert of Object.values(alerts).filter(Boolean)) {
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
        iconType="bell"
        color={type}
        onClickAriaLabel={`${list.length} alert(s)`}
        onClick={() => setShowPopover(type)}
      >
        {list.length} alert(s)
      </EuiBadge>
    );

    const panels = [
      {
        id: 0,
        title: `Alerts`,
        items: list.map(({ alert, states }, index) => {
          return {
            name: (
              <Fragment>
                <EuiText size="s">
                  <h4>{getDateFromState(states)}</h4>
                </EuiText>
                <EuiText>{alert.label}</EuiText>
              </Fragment>
            ),
            panel: index + 1,
          };
        }),
      },
      ...list.map((alertStatus, index) => {
        return {
          id: index + 1,
          title: getDateFromState(alertStatus.states),
          width: 400,
          content: (
            <div style={{ padding: '1rem' }}>
              <AlertStatus alert={alertStatus} />
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
