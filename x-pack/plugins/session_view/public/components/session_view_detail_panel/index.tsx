/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { EuiTabs, EuiTab, EuiNotificationBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiTabProps } from '../../types';
import { Process, ProcessEvent } from '../../../common/types/process_tree';
import { getDetailPanelProcess, getSelectedTabContent } from './helpers';
import { DetailPanelProcessTab } from '../detail_panel_process_tab';
import { DetailPanelHostTab } from '../detail_panel_host_tab';
import { useStyles } from './styles';
import { DetailPanelAlertTab } from '../detail_panel_alert_tab';
import { ALERT_COUNT_THRESHOLD } from '../../../common/constants';

interface SessionViewDetailPanelDeps {
  selectedProcess: Process | undefined;
  alerts?: ProcessEvent[];
  investigatedAlert?: ProcessEvent;
  onProcessSelected: (process: Process) => void;
  onShowAlertDetails: (alertId: string) => void;
}

/**
 * Detail panel in the session view.
 */
export const SessionViewDetailPanel = ({
  alerts,
  selectedProcess,
  investigatedAlert,
  onProcessSelected,
  onShowAlertDetails,
}: SessionViewDetailPanelDeps) => {
  const [selectedTabId, setSelectedTabId] = useState('process');
  const processDetail = useMemo(() => getDetailPanelProcess(selectedProcess), [selectedProcess]);

  const alertsCount = useMemo(() => {
    if (!alerts) {
      return 0;
    }

    return alerts.length >= ALERT_COUNT_THRESHOLD ? ALERT_COUNT_THRESHOLD + '+' : alerts.length;
  }, [alerts]);

  const tabs: EuiTabProps[] = useMemo(() => {
    const hasAlerts = !!alerts?.length;

    return [
      {
        id: 'process',
        name: i18n.translate('xpack.sessionView.detailsPanel.process', {
          defaultMessage: 'Process',
        }),
        content: <DetailPanelProcessTab processDetail={processDetail} />,
      },
      {
        id: 'host',
        name: i18n.translate('xpack.sessionView.detailsPanel.host', {
          defaultMessage: 'Host',
        }),
        content: <DetailPanelHostTab processHost={selectedProcess?.events[0]?.host} />,
      },
      {
        id: 'alerts',
        name: i18n.translate('xpack.sessionView.detailsPanel.alerts', {
          defaultMessage: 'Alerts',
        }),
        append: hasAlerts && (
          <EuiNotificationBadge className="eui-alignCenter" size="m">
            {alertsCount}
          </EuiNotificationBadge>
        ),
        content: alerts && (
          <DetailPanelAlertTab
            alerts={alerts}
            onProcessSelected={onProcessSelected}
            onShowAlertDetails={onShowAlertDetails}
            investigatedAlert={investigatedAlert}
          />
        ),
      },
    ];
  }, [
    alerts,
    alertsCount,
    processDetail,
    selectedProcess?.events,
    onProcessSelected,
    onShowAlertDetails,
    investigatedAlert,
  ]);

  const onSelectedTabChanged = useCallback((id: string) => {
    setSelectedTabId(id);
  }, []);

  const tabContent = useMemo(
    () => getSelectedTabContent(tabs, selectedTabId),
    [tabs, selectedTabId]
  );

  const styles = useStyles();

  return (
    <div css={styles.detailsPanelLeftBorder}>
      <EuiTabs size="l" expand>
        {tabs.map((tab, index) => (
          <EuiTab
            key={index}
            onClick={() => onSelectedTabChanged(tab.id)}
            isSelected={tab.id === selectedTabId}
            disabled={tab.disabled}
            prepend={tab.prepend}
            append={tab.append}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      {tabContent}
    </div>
  );
};
