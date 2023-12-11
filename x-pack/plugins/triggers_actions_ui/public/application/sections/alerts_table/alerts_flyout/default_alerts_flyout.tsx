/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  type EuiDataGridColumn,
  EuiDescriptionList,
  EuiInMemoryTable,
  EuiPanel,
  EuiTabbedContent,
  EuiTabbedContentProps,
  EuiTabbedContentTab,
  EuiTitle,
  useEuiOverflowScroll,
} from '@elastic/eui';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
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

export const search = {
  box: {
    incremental: true,
    placeholder: i18n.translate(
      'xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.filter.placeholder',
      {
        defaultMessage: 'Filter by Field, Value, or Description...',
      }
    ),
    schema: true,
  },
};

const ScrollableFlyoutTabbedContent = (props: EuiTabbedContentProps) => (
  <EuiTabbedContent
    css={css`
      display: flex;
      flex-direction: column;
      flex: 1;

      & [role='tabpanel'] {
        display: flex;
        flex: 1 0 0;
        ${useEuiOverflowScroll('y', true)}
      }
    `}
    {...props}
  />
);

type TabId = 'overview';

const COUNT_PER_PAGE_OPTIONS = [25, 50, 100];

const useFieldBrowserPagination = () => {
  const [pagination, setPagination] = useState<{ pageIndex: number }>({
    pageIndex: 0,
  });

  const onTableChange = useCallback(({ page: { index } }: { page: { index: number } }) => {
    setPagination({ pageIndex: index });
  }, []);
  const paginationTableProp = useMemo(
    () => ({
      ...pagination,
      pageSizeOptions: COUNT_PER_PAGE_OPTIONS,
    }),
    [pagination]
  );

  return {
    onTableChange,
    paginationTableProp,
  };
};

const FieldsTable = memo(({ alert }: Pick<AlertsTableFlyoutBaseProps, 'alert'>) => {
  const { onTableChange, paginationTableProp } = useFieldBrowserPagination();
  return (
    <EuiInMemoryTable
      items={Object.entries(alert).map(([key, value]) => ({ key, value: value?.[0] }))}
      itemId="key"
      columns={[
        {
          field: 'key',
          name: i18n.translate('xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.field', {
            defaultMessage: 'Field',
          }),
        },
        {
          field: 'value',
          name: i18n.translate('xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.value', {
            defaultMessage: 'Value',
          }),
        },
      ]}
      onTableChange={onTableChange}
      pagination={paginationTableProp}
      search={search}
    />
  );
});

export const getDefaultAlertFlyout =
  (columns: EuiDataGridColumn[], formatter: RegisterFormatter) => () => {
    const FlyoutBody: AlertTableFlyoutComponent = ({ alert }: AlertsTableFlyoutBaseProps) => {
      const overviewTab = useMemo(
        () => ({
          id: 'overview',
          name: i18n.translate(
            'xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.overview',
            {
              defaultMessage: 'Overview',
            }
          ),
          content: (
            <EuiPanel hasShadow={false}>
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
          name: i18n.translate('xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.table', {
            defaultMessage: 'Table',
          }),
          content: (
            <EuiPanel>
              <FieldsTable alert={alert} />
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
        />
      );
    };

    return {
      header: FlyoutHeader,
      body: FlyoutBody,
      footer: null,
    };
  };
