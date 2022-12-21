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
import { getSelectedTabContent } from './helpers';
import { DetailPanelProcessTab } from '../detail_panel_process_tab';
import { DetailPanelMetadataTab } from '../detail_panel_metadata_tab';
import { useStyles } from './styles';
import { DetailPanelAlertTab } from '../detail_panel_alert_tab';
import { ALERT_COUNT_THRESHOLD } from '../../../common/constants';

interface SessionViewDetailPanelDeps {
  selectedProcess: Process | null;
  alerts?: ProcessEvent[];
  alertsCount: number;
  isFetchingAlerts: boolean;
  hasNextPageAlerts?: boolean;
  fetchNextPageAlerts: () => void;
  investigatedAlertId?: string;
  onJumpToEvent: (event: ProcessEvent) => void;
  onShowAlertDetails: (alertId: string) => void;
}

/**
 * Detail panel in the session view.
 */
export const SessionViewDetailPanel = ({
  alerts,
  alertsCount,
  isFetchingAlerts,
  hasNextPageAlerts,
  fetchNextPageAlerts,
  selectedProcess,
  investigatedAlertId,
  onJumpToEvent,
  onShowAlertDetails,
}: SessionViewDetailPanelDeps) => {
  const [selectedTabId, setSelectedTabId] = useState('process');

  const alertsCountStr = useMemo(() => {
    return alertsCount >= ALERT_COUNT_THRESHOLD ? ALERT_COUNT_THRESHOLD + '+' : alertsCount + '';
  }, [alertsCount]);

  const tabs: EuiTabProps[] = useMemo(() => {
    const hasAlerts = !!alerts?.length;

    return [
      {
        id: 'process',
        name: i18n.translate('xpack.sessionView.detailsPanel.process', {
          defaultMessage: 'Process',
        }),
        content: <DetailPanelProcessTab selectedProcess={selectedProcess} />,
      },
      {
        id: 'metadata',
        name: i18n.translate('xpack.sessionView.detailsPanel.metadata', {
          defaultMessage: 'Metadata',
        }),
        content: (
          <DetailPanelMetadataTab
            processHost={selectedProcess?.getDetails()?.host}
            processContainer={selectedProcess?.getDetails()?.container}
            processOrchestrator={selectedProcess?.getDetails()?.orchestrator}
            processCloud={selectedProcess?.getDetails()?.cloud}
          />
        ),
      },
      {
        id: 'alerts',
        name: i18n.translate('xpack.sessionView.detailsPanel.alerts', {
          defaultMessage: 'Alerts',
        }),
        append: hasAlerts && (
          <EuiNotificationBadge className="eui-alignCenter" size="m">
            {alertsCountStr}
          </EuiNotificationBadge>
        ),
        content: alerts && (
          <DetailPanelAlertTab
            alerts={alerts}
            isFetchingAlerts={isFetchingAlerts}
            hasNextPageAlerts={hasNextPageAlerts}
            fetchNextPageAlerts={fetchNextPageAlerts}
            onJumpToEvent={onJumpToEvent}
            onShowAlertDetails={onShowAlertDetails}
            investigatedAlertId={investigatedAlertId}
          />
        ),
      },
    ];
  }, [
    alerts,
    alertsCountStr,
    fetchNextPageAlerts,
    hasNextPageAlerts,
    isFetchingAlerts,
    selectedProcess,
    onJumpToEvent,
    onShowAlertDetails,
    investigatedAlertId,
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
    <div css={styles.detailsPanel}>
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
