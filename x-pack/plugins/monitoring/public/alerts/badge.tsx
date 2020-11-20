/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenu, EuiPopover, EuiBadge, EuiSwitch } from '@elastic/eui';
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
import { getFiringAlertCount } from './lib/get_firing_alert_count';
import {
  BEATS_SYSTEM_ID,
  ELASTICSEARCH_SYSTEM_ID,
  KIBANA_SYSTEM_ID,
  LOGSTASH_SYSTEM_ID,
} from '../../common/constants';

export const numberOfAlertsLabel = (count: number) => `${count} alert${count > 1 ? 's' : ''}`;

const MAX_TO_SHOW_BY_CATEGORY = 8;

const PANEL_TITLE = i18n.translate('xpack.monitoring.alerts.badge.panelTitle', {
  defaultMessage: 'Alerts',
});

const GROUP_BY_NODE = i18n.translate('xpack.monitoring.alerts.badge.groupByNode', {
  defaultMessage: 'Group by node',
});

const GROUP_BY_INSTANCE = i18n.translate('xpack.monitoring.alerts.badge.groupByInstace', {
  defaultMessage: 'Group by instance',
});

const GROUP_BY_TYPE = i18n.translate('xpack.monitoring.alerts.badge.groupByType', {
  defaultMessage: 'Group by alert type',
});

interface Props {
  alerts: CommonAlertStatus[];
  stateFilter: (state: AlertState) => boolean;
  nextStepsFilter: (nextStep: AlertMessage) => boolean;
}
export const AlertsBadge: React.FC<Props> = (props: Props) => {
  const { stateFilter = () => true, nextStepsFilter = () => true } = props;
  // We do not always have the alerts that each consumer wants due to licensing
  const alerts = props.alerts.filter(Boolean);
  const [showPopover, setShowPopover] = React.useState<AlertSeverity | boolean | null>(null);
  const inSetupMode = isInSetupMode(React.useContext(SetupModeContext));
  const alertsContext = React.useContext(AlertsContext);
  const alertCount = inSetupMode ? alerts.length : getFiringAlertCount(alerts, stateFilter);
  const [showByNode, setShowByNode] = React.useState(
    !inSetupMode && alertCount > MAX_TO_SHOW_BY_CATEGORY
  );

  React.useEffect(() => {
    if (inSetupMode && showByNode) {
      setShowByNode(false);
    }
  }, [inSetupMode, showByNode]);

  if (alertCount === 0) {
    return null;
  }

  let groupByType = GROUP_BY_NODE;
  for (const alert of alerts) {
    for (const { state } of alert.states.filter(
      ({ firing, state: _state }) => firing && stateFilter(_state)
    )) {
      switch (state.stackProduct) {
        case ELASTICSEARCH_SYSTEM_ID:
        case LOGSTASH_SYSTEM_ID:
          groupByType = GROUP_BY_NODE;
          break;
        case KIBANA_SYSTEM_ID:
        case BEATS_SYSTEM_ID:
          groupByType = GROUP_BY_INSTANCE;
          break;
      }
    }
  }

  const panels = showByNode
    ? getAlertPanelsByNode(PANEL_TITLE, alerts, stateFilter, nextStepsFilter)
    : getAlertPanelsByCategory(
        PANEL_TITLE,
        inSetupMode,
        alerts,
        alertsContext,
        stateFilter,
        nextStepsFilter
      );

  if (panels.length && !inSetupMode && panels[0].items) {
    panels[0].items.push(
      ...[
        {
          isSeparator: true as const,
        },
        {
          name: (
            <EuiSwitch
              checked={false}
              onChange={() => setShowByNode(!showByNode)}
              label={showByNode ? GROUP_BY_TYPE : groupByType}
            />
          ),
        },
      ]
    );
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
      <EuiContextMenu
        key={`${showByNode ? 'byNode' : 'byType'}_${panels.length}`}
        initialPanelId={0}
        panels={panels}
      />
    </EuiPopover>
  );
};
