/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip, EuiHealth } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { CommonAlertStatus, AlertState } from '../../common/types/alerts';
import { AlertSeverity } from '../../common/enums';
import { AlertsBadge } from './badge';
import { isInSetupMode } from '../lib/setup_mode';
import { SetupModeContext } from '../components/setup_mode/setup_mode_context';

interface Props {
  alerts: { [alertTypeId: string]: CommonAlertStatus[] };
  showBadge: boolean;
  showOnlyCount?: boolean;
  stateFilter?: (state: AlertState) => boolean;
}
export const AlertsStatus: React.FC<Props> = (props: Props) => {
  const { alerts, showBadge = false, showOnlyCount = false, stateFilter = () => true } = props;
  const inSetupMode = isInSetupMode(React.useContext(SetupModeContext));

  if (!alerts) {
    return null;
  }

  let atLeastOneDanger = false;
  const count = Object.values(alerts)
    .flat()
    .reduce((cnt, alertStatus) => {
      const firingStates = alertStatus.states.filter((state) => state.firing);
      const firingAndFilterStates = firingStates.filter((state) => stateFilter(state.state));
      cnt += firingAndFilterStates.length;
      if (firingStates.length) {
        if (!atLeastOneDanger) {
          for (const state of alertStatus.states) {
            if (
              stateFilter(state.state) &&
              (state.state as AlertState).ui.severity === AlertSeverity.Danger
            ) {
              atLeastOneDanger = true;
              break;
            }
          }
        }
      }
      return cnt;
    }, 0);

  if (count === 0 && (!inSetupMode || showOnlyCount)) {
    return (
      <EuiToolTip
        content={i18n.translate('xpack.monitoring.alerts.status.clearToolip', {
          defaultMessage: 'No alerts firing',
        })}
        position="bottom"
      >
        <EuiHealth color="success" data-test-subj="alertIcon">
          {showOnlyCount ? (
            count
          ) : (
            <span data-test-subj="alertStatusText">
              <FormattedMessage
                id="xpack.monitoring.alerts.status.clearText"
                defaultMessage="Clear"
              />
            </span>
          )}
        </EuiHealth>
      </EuiToolTip>
    );
  }

  if (showBadge || inSetupMode) {
    return <AlertsBadge alerts={alerts} stateFilter={stateFilter} />;
  }
  const severity = atLeastOneDanger ? AlertSeverity.Danger : AlertSeverity.Warning;

  const tooltipText = (() => {
    switch (severity) {
      case AlertSeverity.Danger:
        return i18n.translate('xpack.monitoring.alerts.status.highSeverityTooltip', {
          defaultMessage: 'There are some critical issues that require your immediate attention!',
        });
      case AlertSeverity.Warning:
        return i18n.translate('xpack.monitoring.alerts.status.mediumSeverityTooltip', {
          defaultMessage: 'There are some issues that might have impact on the stack.',
        });
      default:
        // might never show
        return i18n.translate('xpack.monitoring.alerts.status.lowSeverityTooltip', {
          defaultMessage: 'There are some low-severity issues.',
        });
    }
  })();

  return (
    <EuiToolTip content={tooltipText} position="bottom">
      <EuiHealth color={severity} data-test-subj="alertIcon">
        {showOnlyCount ? (
          count
        ) : (
          <FormattedMessage
            id="xpack.monitoring.alerts.status.alertsTooltip"
            defaultMessage="Alerts"
          />
        )}
      </EuiHealth>
    </EuiToolTip>
  );
};
