/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
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
import { AlertPanel } from './panel';
import { Legacy } from '../legacy_shims';
import { isInSetupMode } from '../lib/setup_mode';

function getDateFromState(states: CommonAlertState[]) {
  const timestamp = states[0].state.ui.triggeredMS;
  const tz = Legacy.shims.uiSettings.get('dateFormat:tz');
  return formatDateTimeLocal(timestamp, false, tz === 'Browser' ? null : tz);
}

export const numberOfAlertsLabel = (count: number) => `${count} alert${count > 1 ? 's' : ''}`;

interface Props {
  alerts: { [alertTypeId: string]: CommonAlertStatus };
}
export const AlertsBadge: React.FC<Props> = (props: Props) => {
  const [showPopover, setShowPopover] = React.useState<AlertSeverity | boolean | null>(null);
  const inSetupMode = isInSetupMode();
  const alerts = Object.values(props.alerts).filter(Boolean);

  if (alerts.length === 0) {
    return null;
  }

  const badges = [];

  if (inSetupMode) {
    const button = (
      <EuiBadge
        iconType="bell"
        onClickAriaLabel={numberOfAlertsLabel(alerts.length)}
        onClick={() => setShowPopover(true)}
      >
        {numberOfAlertsLabel(alerts.length)}
      </EuiBadge>
    );
    const panels = [
      {
        id: 0,
        title: i18n.translate('xpack.monitoring.alerts.badge.panelTitle', {
          defaultMessage: 'Alerts',
        }),
        items: alerts.map(({ alert }, index) => {
          return {
            name: <EuiText>{alert.label}</EuiText>,
            panel: index + 1,
          };
        }),
      },
      ...alerts.map((alertStatus, index) => {
        return {
          id: index + 1,
          title: alertStatus.alert.label,
          width: 400,
          content: <AlertPanel alert={alertStatus} />,
        };
      }),
    ];

    badges.push(
      <EuiPopover
        id="monitoringAlertMenu"
        button={button}
        isOpen={showPopover === true}
        closePopover={() => setShowPopover(null)}
        panelPaddingSize="none"
        withTitle
        anchorPosition="downLeft"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
    );
  } else {
    const byType = {
      [AlertSeverity.Danger]: [] as CommonAlertStatus[],
      [AlertSeverity.Warning]: [] as CommonAlertStatus[],
      [AlertSeverity.Success]: [] as CommonAlertStatus[],
    };

    for (const alert of alerts) {
      for (const alertState of alert.states) {
        const state = alertState.state as AlertState;
        byType[state.ui.severity].push(alert);
      }
    }

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
          onClickAriaLabel={numberOfAlertsLabel(list.length)}
          onClick={() => setShowPopover(type)}
        >
          {numberOfAlertsLabel(list.length)}
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
            content: <AlertPanel alert={alertStatus} />,
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
