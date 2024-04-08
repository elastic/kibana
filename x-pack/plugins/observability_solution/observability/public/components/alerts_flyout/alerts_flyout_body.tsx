/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { EuiPanel, EuiTabbedContentTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AlertFieldsTable, ScrollableFlyoutTabbedContent } from '@kbn/alerts-ui-shared';
import { AlertsTableFlyoutBaseProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { TopAlert } from '../../typings/alerts';
import { AlertOverview } from '../alert_overview/alert_overview';

interface FlyoutProps {
  rawAlert: AlertsTableFlyoutBaseProps['alert'];
  alert: TopAlert;
  id?: string;
}

type TabId = 'overview' | 'table';

export function AlertsFlyoutBody({ alert, rawAlert, id: pageId }: FlyoutProps) {
  const overviewTab = useMemo(() => {
    return {
      id: 'overview',
      'data-test-subj': 'overviewTab',
      name: i18n.translate('xpack.observability.alertFlyout.overview', {
        defaultMessage: 'Overview',
      }),
      content: <AlertOverview alert={alert} pageId={pageId} />,
    };
  }, [alert, pageId]);

  const metadataTab = useMemo(
    () => ({
      id: 'metadata',
      'data-test-subj': 'metadataTab',
      name: i18n.translate('xpack.observability.alertsFlyout.metadata', {
        defaultMessage: 'Metadata',
      }),
      content: (
        <EuiPanel hasShadow={false} data-test-subj="metadataTabPanel">
          <AlertFieldsTable alert={rawAlert} />
        </EuiPanel>
      ),
    }),
    [rawAlert]
  );

  const tabs = useMemo(() => [overviewTab, metadataTab], [overviewTab, metadataTab]);
  const [selectedTabId, setSelectedTabId] = useState<TabId>('overview');
  const handleTabClick = useCallback(
    (tab: EuiTabbedContentTab) => setSelectedTabId(tab.id as TabId),
    []
  );

  const selectedTab = useMemo(
    () => tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0],
    [tabs, selectedTabId]
  );

  return (
    <ScrollableFlyoutTabbedContent
      tabs={tabs}
      selectedTab={selectedTab}
      onTabClick={handleTabClick}
      expand
      data-test-subj="defaultAlertFlyoutTabs"
    />
  );
}
