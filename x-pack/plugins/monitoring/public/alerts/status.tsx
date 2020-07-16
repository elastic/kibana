/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiToolTip, EuiHealth } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { CommonAlertStatus } from '../../common/types';
import { AlertSeverity } from '../../common/enums';
import { AlertState } from '../../server/alerts/types';
import { AlertsBadge } from './badge';

interface Props {
  alerts: { [alertTypeId: string]: CommonAlertStatus };
  showBadge: boolean;
  showOnlyCount: boolean;
}
export const AlertsStatus: React.FC<Props> = (props: Props) => {
  const { alerts, showBadge = false, showOnlyCount = false } = props;

  let atLeastOneDanger = false;
  const count = Object.values(alerts).reduce((cnt, alertStatus) => {
    if (alertStatus.states.length) {
      if (!atLeastOneDanger) {
        for (const state of alertStatus.states) {
          if ((state.state as AlertState).ui.severity === AlertSeverity.Danger) {
            atLeastOneDanger = true;
            break;
          }
        }
      }
      cnt++;
    }
    return cnt;
  }, 0);

  if (count === 0) {
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
            <FormattedMessage
              id="xpack.monitoring.alerts.status.clearText"
              defaultMessage="Clear"
            />
          )}
        </EuiHealth>
      </EuiToolTip>
    );
  }

  if (showBadge) {
    return <AlertsBadge alerts={alerts} />;
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
