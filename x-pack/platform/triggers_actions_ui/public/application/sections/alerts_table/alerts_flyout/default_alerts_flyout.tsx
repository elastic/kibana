/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  type EuiDataGridColumn,
  EuiDescriptionList,
  EuiPanel,
  EuiTabbedContentTab,
  EuiTitle,
} from '@elastic/eui';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { ScrollableFlyoutTabbedContent, AlertFieldsTable } from '@kbn/alerts-ui-shared';
import { RegisterFormatter } from '../cells/render_cell_value';
import { AlertsTableFlyoutBaseProps, AlertTableFlyoutComponent } from '../../../..';

const FlyoutHeader: AlertTableFlyoutComponent = ({ alert }: AlertsTableFlyoutBaseProps) => {
  const name = alert[ALERT_RULE_NAME];
  return (
    <EuiTitle size="s">
      <h3>{name}</h3>
    </EuiTitle>
  );
};

type TabId = 'overview' | 'table';

export const getDefaultAlertFlyout =
  (columns: EuiDataGridColumn[], formatter: RegisterFormatter) => () => {
    const FlyoutBody: AlertTableFlyoutComponent = ({ alert }: AlertsTableFlyoutBaseProps) => {
      const overviewTab = useMemo(
        () => ({
          id: 'overview',
          'data-test-subj': 'overviewTab',
          name: i18n.translate(
            'xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.overview',
            {
              defaultMessage: 'Overview',
            }
          ),
          content: (
            <EuiPanel hasShadow={false} data-test-subj="overviewTabPanel">
              <EuiDescriptionList
                listItems={columns.map((column) => {
                  const value = get(alert, column.id)?.[0];

                  return {
                    title: column.displayAsText as string,
                    description: value != null ? formatter(column.id, value) : '—',
                  };
                })}
                type="column"
                columnWidths={[1, 3]}
              />
            </EuiPanel>
          ),
        }),
        [alert]
      );

      const tableTab = useMemo(
        () => ({
          id: 'table',
          'data-test-subj': 'tableTab',
          name: i18n.translate('xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.table', {
            defaultMessage: 'Table',
          }),
          content: (
            <EuiPanel hasShadow={false} data-test-subj="tableTabPanel">
              <AlertFieldsTable alert={alert} />
            </EuiPanel>
          ),
        }),
        [alert]
      );

      const tabs = useMemo(() => [overviewTab, tableTab], [overviewTab, tableTab]);
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
    };

    return {
      header: FlyoutHeader,
      body: FlyoutBody,
      footer: null,
    };
  };
