/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenu, EuiPopover, EuiBadge } from '@elastic/eui';
import { CommonAlertStatus } from '../../common/types/alerts';
import { AlertSeverity } from '../../common/enums';
// @ts-ignore
import { formatDateTimeLocal } from '../../common/formatting';
import { AlertMessage, AlertState } from '../../common/types/alerts';
import { isInSetupMode } from '../lib/setup_mode';
import { SetupModeContext } from '../components/setup_mode/setup_mode_context';
import { AlertsContext } from './context';
import { getAlertPanelsByCategory } from './lib/get_alert_panels_by_category';
import { getAlertPanelsByNode } from './lib/get_alert_panels_by_node';

export const numberOfAlertsLabel = (count: number) => `${count} alert${count > 1 ? 's' : ''}`;

const MAX_TO_SHOW_IN_LIST = 8;

interface Props {
  alerts: CommonAlertStatus[];
  stateFilter: (state: AlertState) => boolean;
  nextStepsFilter: (nextStep: AlertMessage) => boolean;
}
export const AlertsBadge: React.FC<Props> = (props: Props) => {
  const { alerts, stateFilter = () => true, nextStepsFilter = () => true } = props;
  const [showPopover, setShowPopover] = React.useState<AlertSeverity | boolean | null>(null);
  const inSetupMode = isInSetupMode(React.useContext(SetupModeContext));
  const alertsContext = React.useContext(AlertsContext);

  if (alerts.length === 0) {
    return null;
  }

  const panelTitle = i18n.translate('xpack.monitoring.alerts.badge.panelTitle', {
    defaultMessage: 'Alerts',
  });

  let { panels, alertCount } = getAlertPanelsByCategory(
    panelTitle,
    inSetupMode,
    alerts,
    alertsContext,
    stateFilter,
    nextStepsFilter
  );

  if (alertCount > MAX_TO_SHOW_IN_LIST) {
    const result = getAlertPanelsByNode(panelTitle, alerts, stateFilter, nextStepsFilter);
    panels = result.panels;
    alertCount = result.alertCount;
  }

  const button = (
    <EuiBadge
      iconType="bell"
      color={inSetupMode ? 'default' : 'danger'}
      onClickAriaLabel={numberOfAlertsLabel(alertCount)}
      onClick={() => setShowPopover(true)}
    >
      {numberOfAlertsLabel(alertCount)}
    </EuiBadge>
  );

  return (
    <EuiPopover
      id="monitoringAlertMenu"
      button={button}
      isOpen={showPopover === true}
      closePopover={() => setShowPopover(null)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId={0} panels={panels as any} />
    </EuiPopover>
  );
};
