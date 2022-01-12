/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenu, EuiPopover, EuiBadge, EuiSwitch } from '@elastic/eui';
import { AlertState, CommonAlertStatus } from '../../common/types/alerts';
import { AlertSeverity } from '../../common/enums';
// @ts-ignore
import { formatDateTimeLocal } from '../../common/formatting';
import { isInSetupMode } from '../lib/setup_mode';
import { SetupModeContext } from '../components/setup_mode/setup_mode_context';
import { getAlertPanelsByCategory } from './lib/get_alert_panels_by_category';
import { getAlertPanelsByNode } from './lib/get_alert_panels_by_node';

export const numberOfAlertsLabel = (count: number) => `${count} alert${count > 1 ? 's' : ''}`;
export const numberOfRulesLabel = (count: number) => `${count} rule${count > 1 ? 's' : ''}`;

const MAX_TO_SHOW_BY_CATEGORY = 8;

const PANEL_TITLE_ALERTS = i18n.translate('xpack.monitoring.alerts.badge.panelTitle', {
  defaultMessage: 'Alerts',
});

const PANEL_TITLE_RULES = i18n.translate('xpack.monitoring.rules.badge.panelTitle', {
  defaultMessage: 'Rules',
});

const GROUP_BY_NODE = i18n.translate('xpack.monitoring.alerts.badge.groupByNode', {
  defaultMessage: 'Group by node',
});

const GROUP_BY_TYPE = i18n.translate('xpack.monitoring.alerts.badge.groupByType', {
  defaultMessage: 'Group by alert type',
});

interface Props {
  alerts: { [alertTypeId: string]: CommonAlertStatus[] };
  stateFilter: (state: AlertState) => boolean;
}
export const AlertsBadge: React.FC<Props> = (props: Props) => {
  // We do not always have the alerts that each consumer wants due to licensing
  const { stateFilter = () => true } = props;
  const alertsList = Object.values(props.alerts).flat();
  const alerts = alertsList.filter((alertItem) => Boolean(alertItem?.sanitizedRule));
  const [showPopover, setShowPopover] = React.useState<AlertSeverity | boolean | null>(null);
  const inSetupMode = isInSetupMode(React.useContext(SetupModeContext));
  const alertCount = inSetupMode
    ? alerts.length
    : alerts.reduce(
        (sum, { states }) => sum + states.filter(({ state }) => stateFilter(state)).length,
        0
      );
  const [showByNode, setShowByNode] = React.useState(
    !inSetupMode && alertCount > MAX_TO_SHOW_BY_CATEGORY
  );
  const PANEL_TITLE = inSetupMode ? PANEL_TITLE_RULES : PANEL_TITLE_ALERTS;

  React.useEffect(() => {
    if (inSetupMode && showByNode) {
      setShowByNode(false);
    }
  }, [inSetupMode, showByNode]);

  if (alertCount === 0) {
    return null;
  }

  const groupByType = GROUP_BY_NODE;
  const panels = showByNode
    ? getAlertPanelsByNode(PANEL_TITLE, alerts, stateFilter)
    : getAlertPanelsByCategory(PANEL_TITLE, !!inSetupMode, alerts, stateFilter);
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
      data-test-subj="alertsBadge"
      onClickAriaLabel={
        inSetupMode ? numberOfRulesLabel(alertCount) : numberOfAlertsLabel(alertCount)
      }
      onClick={() => setShowPopover(true)}
    >
      {inSetupMode ? numberOfRulesLabel(alertCount) : numberOfAlertsLabel(alertCount)}
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
