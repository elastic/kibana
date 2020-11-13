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
import { CommonAlertStatus, CommonAlertState } from '../../common/types/alerts';
import { AlertSeverity } from '../../common/enums';
// @ts-ignore
import { formatDateTimeLocal } from '../../common/formatting';
import { AlertMessage, AlertState } from '../../common/types/alerts';
import { AlertPanel } from './panel';
import { Legacy } from '../legacy_shims';
import { isInSetupMode } from '../lib/setup_mode';
import { SetupModeContext } from '../components/setup_mode/setup_mode_context';

function getDateFromState(state: CommonAlertState) {
  const timestamp = state.state.ui.triggeredMS;
  const tz = Legacy.shims.uiSettings.get('dateFormat:tz');
  return formatDateTimeLocal(timestamp, false, tz === 'Browser' ? null : tz);
}

export const numberOfAlertsLabel = (count: number) => `${count} alert${count > 1 ? 's' : ''}`;

interface AlertInPanel {
  alert: CommonAlertStatus;
  alertState: CommonAlertState;
}

interface Props {
  alerts: { [alertTypeId: string]: CommonAlertStatus };
  stateFilter: (state: AlertState) => boolean;
  nextStepsFilter: (nextStep: AlertMessage) => boolean;
}
export const AlertsBadge: React.FC<Props> = (props: Props) => {
  const { stateFilter = () => true, nextStepsFilter = () => true } = props;
  const [showPopover, setShowPopover] = React.useState<AlertSeverity | boolean | null>(null);
  const inSetupMode = isInSetupMode(React.useContext(SetupModeContext));
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
          content: <AlertPanel alert={alertStatus} nextStepsFilter={nextStepsFilter} />,
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
        anchorPosition="downLeft"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
    );
  } else {
    const byType = {
      [AlertSeverity.Danger]: [] as AlertInPanel[],
      [AlertSeverity.Warning]: [] as AlertInPanel[],
      [AlertSeverity.Success]: [] as AlertInPanel[],
    };

    for (const alert of alerts) {
      for (const alertState of alert.states) {
        if (alertState.firing && stateFilter(alertState.state)) {
          const state = alertState.state as AlertState;
          byType[state.ui.severity].push({
            alertState,
            alert,
          });
        }
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
          items: list.map(({ alert, alertState }, index) => {
            return {
              name: (
                <Fragment>
                  <EuiText size="s">
                    <h4>{getDateFromState(alertState)}</h4>
                  </EuiText>
                  <EuiText>{alert.alert.label}</EuiText>
                </Fragment>
              ),
              panel: index + 1,
            };
          }),
        },
        ...list.map((alertStatus, index) => {
          return {
            id: index + 1,
            title: getDateFromState(alertStatus.alertState),
            width: 400,
            content: (
              <AlertPanel
                alert={alertStatus.alert}
                alertState={alertStatus.alertState}
                nextStepsFilter={nextStepsFilter}
              />
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
          anchorPosition="downLeft"
        >
          <EuiContextMenu initialPanelId={0} panels={panels} />
        </EuiPopover>
      );
    }
  }

  return (
    <EuiFlexGrid data-test-subj="monitoringSetupModeAlertBadges">
      {badges.map((badge, index) => (
        <EuiFlexItem key={index} grow={false}>
          {badge}
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
};
