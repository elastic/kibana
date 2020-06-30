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

interface Props {
  alerts: { [alertTypeId: string]: CommonAlertStatus };
}
export const AlertStatus: React.FC<Props> = (props: Props) => {
  const { alerts } = props;

  let atLeastOneDanger = false;
  const count = Object.values(alerts).reduce((cnt, alertStatus) => {
    if (alertStatus.states.length) {
      for (const state of alertStatus.states) {
        if ((state.state as AlertState).ui.severity === AlertSeverity.Danger) {
          atLeastOneDanger = true;
        }
      }
      cnt++;
    }
    return cnt;
  }, 0);

  if (count === 0) {
    return (
      <EuiToolTip
        content={i18n.translate(
          'xpack.monitoring.cluster.listing.alertsInticator.clearStatusTooltip',
          {
            defaultMessage: 'Cluster status is clear!',
          }
        )}
        position="bottom"
      >
        <EuiHealth color="success" data-test-subj="alertIcon">
          <FormattedMessage
            id="xpack.monitoring.cluster.listing.alertsInticator.clearTooltip"
            defaultMessage="Clear"
          />
        </EuiHealth>
      </EuiToolTip>
    );
  }

  const severity = atLeastOneDanger ? AlertSeverity.Danger : AlertSeverity.Warning;

  const tooltipText = (() => {
    switch (severity) {
      case AlertSeverity.Danger:
        return i18n.translate(
          'xpack.monitoring.cluster.listing.alertsInticator.highSeverityTooltip',
          {
            defaultMessage:
              'There are some critical cluster issues that require your immediate attention!',
          }
        );
      case AlertSeverity.Warning:
        return i18n.translate(
          'xpack.monitoring.cluster.listing.alertsInticator.mediumSeverityTooltip',
          {
            defaultMessage: 'There are some issues that might have impact on your cluster.',
          }
        );
      default:
        // might never show
        return i18n.translate(
          'xpack.monitoring.cluster.listing.alertsInticator.lowSeverityTooltip',
          {
            defaultMessage: 'There are some low-severity cluster issues',
          }
        );
    }
  })();

  return (
    <EuiToolTip content={tooltipText} position="bottom" trigger="hover">
      <EuiHealth color={severity} data-test-subj="alertIcon">
        <FormattedMessage
          id="xpack.monitoring.cluster.listing.alertsInticator.alertsTooltip"
          defaultMessage="Alerts"
        />
      </EuiHealth>
    </EuiToolTip>
  );
};
