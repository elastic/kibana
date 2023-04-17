/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiSearchBar,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { Criteria } from '@elastic/eui/src/components/basic_table/basic_table';
import {
  EuiTableFieldDataColumnType,
  EuiTableSortingType,
} from '@elastic/eui/src/components/basic_table/table_types';
import { UseEuiTheme } from '@elastic/eui/src/services/theme/hooks';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { AnalyticsCollectionExploreTableLogic } from '../analytics_collection_explore_table_logic';
import {
  ExploreTableColumns,
  ExploreTableItem,
  ExploreTables,
  SearchTermsTable,
  TopClickedTable,
  TopReferrersTable,
  WorsePerformersTable,
} from '../analytics_collection_explore_table_types';

interface TableSetting<T = ExploreTableItem, K = T> {
  columns: Array<
    EuiBasicTableColumn<T & K> & {
      render?: (euiTheme: UseEuiTheme['euiTheme']) => EuiTableFieldDataColumnType<T & K>['render'];
    }
  >;
  sorting: EuiTableSortingType<T>;
}

const tabs: Array<{ id: ExploreTables; name: string }> = [
  {
    id: ExploreTables.SearchTerms,
    name: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.explorer.searchTermsTab',
      { defaultMessage: 'Search terms' }
    ),
  },
  {
    id: ExploreTables.TopClicked,
    name: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.explorer.topClickedTab',
      { defaultMessage: 'Top clicked results' }
    ),
  },
  {
    id: ExploreTables.WorsePerformers,
    name: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.explorer.noResultsTab',
      { defaultMessage: 'No results' }
    ),
  },
  {
    id: ExploreTables.TopReferrers,
    name: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.explorer.referrersTab',
      { defaultMessage: 'Referrers' }
    ),
  },
];

const tableSettings: {
  [ExploreTables.SearchTerms]: TableSetting<SearchTermsTable>;
  [ExploreTables.TopClicked]: TableSetting<TopClickedTable>;
  [ExploreTables.TopReferrers]: TableSetting<TopReferrersTable>;
  [ExploreTables.WorsePerformers]: TableSetting<WorsePerformersTable>;
} = {
  [ExploreTables.SearchTerms]: {
    columns: [
      {
        field: ExploreTableColumns.searchTerms,
        name: i18n.translate(
          'xpack.enterpriseSearch.analytics.collections.collectionsView.exploreTable.searchTerms',
          { defaultMessage: 'Search Terms' }
        ),
        sortable: true,
        truncateText: true,
      },
      {
        align: 'right',
        field: ExploreTableColumns.count,
        name: i18n.translate(
          'xpack.enterpriseSearch.analytics.collections.collectionsView.exploreTable.count',
          { defaultMessage: 'Count' }
        ),
        sortable: true,
        truncateText: true,
      },
    ],
    sorting: {
      sort: {
        direction: 'desc',
        field: ExploreTableColumns.count,
      },
    },
  },
  [ExploreTables.WorsePerformers]: {
    columns: [
      {
        field: ExploreTableColumns.query,
        name: i18n.translate(
          'xpack.enterpriseSearch.analytics.collections.collectionsView.exploreTable.query',
          { defaultMessage: 'Query' }
        ),
        sortable: true,
        truncateText: true,
      },
      {
        align: 'right',
        field: ExploreTableColumns.count,
        name: i18n.translate(
          'xpack.enterpriseSearch.analytics.collections.collectionsView.exploreTable.count',
          { defaultMessage: 'Count' }
        ),
        sortable: true,
        truncateText: true,
      },
    ],
    sorting: {
      sort: {
        direction: 'desc',
        field: ExploreTableColumns.count,
      },
    },
  },
  [ExploreTables.TopClicked]: {
    columns: [
      {
        field: ExploreTableColumns.page,
        name: i18n.translate(
          'xpack.enterpriseSearch.analytics.collections.collectionsView.exploreTable.page',
          { defaultMessage: 'Page' }
        ),
        render: (euiTheme: UseEuiTheme['euiTheme']) => (value: string) =>
          (
            <EuiText size="s" color={euiTheme.colors.primaryText}>
              <p>{value}</p>
            </EuiText>
          ),
        sortable: true,
        truncateText: true,
      },
      {
        align: 'right',
        field: ExploreTableColumns.count,
        name: i18n.translate(
          'xpack.enterpriseSearch.analytics.collections.collectionsView.exploreTable.count',
          { defaultMessage: 'Count' }
        ),
        sortable: true,
        truncateText: true,
      },
    ],
    sorting: {
      sort: {
        direction: 'desc',
        field: ExploreTableColumns.count,
      },
    },
  },
  [ExploreTables.TopReferrers]: {
    columns: [
      {
        field: ExploreTableColumns.page,
        name: i18n.translate(
          'xpack.enterpriseSearch.analytics.collections.collectionsView.exploreTable.page',
          { defaultMessage: 'Page' }
        ),
        render: (euiTheme: UseEuiTheme['euiTheme']) => (value: string) =>
          (
            <EuiText size="s" color={euiTheme.colors.primaryText}>
              <p>{value}</p>
            </EuiText>
          ),
        sortable: true,
        truncateText: true,
      },
      {
        align: 'right',
        field: ExploreTableColumns.sessions,
        name: i18n.translate(
          'xpack.enterpriseSearch.analytics.collections.collectionsView.exploreTable.session',
          { defaultMessage: 'Session' }
        ),
        sortable: true,
        truncateText: true,
      },
    ],
    sorting: {
      sort: {
        direction: 'desc',
        field: ExploreTableColumns.sessions,
      },
    },
  },
};

export const AnalyticsCollectionExplorerTable = () => {
  const { euiTheme } = useEuiTheme();
  const { setSelectedTable, setPageIndex, setPageSize, setSearch, setSorting } = useActions(
    AnalyticsCollectionExploreTableLogic
  );
  const { items, isLoading, pageIndex, pageSize, search, selectedTable, sorting, totalItemsCount } =
    useValues(AnalyticsCollectionExploreTableLogic);
  let table = selectedTable !== null && (tableSettings[selectedTable] as TableSetting);
  if (table) {
    table = {
      ...table,
      columns: table.columns.map((column) => ({
        ...column,
        render: column.render?.(euiTheme),
      })) as TableSetting['columns'],
      sorting: { ...table.sorting, sort: sorting || undefined },
    };
  }
  const onTableChange = ({ sort, page }: Criteria<ExploreTableItem>) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
    setSorting(sort);
  };

  useEffect(() => {
    if (!selectedTable) {
      const firstTabId = tabs[0].id;

      setSelectedTable(firstTabId, (tableSettings[firstTabId] as TableSetting)?.sorting?.sort);
    }
  }, []);

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiTabs>
        {tabs?.map(({ id, name }) => (
          <EuiTab
            key={id}
            onClick={() => setSelectedTable(id, (tableSettings[id] as TableSetting)?.sorting?.sort)}
            isSelected={id === selectedTable}
          >
            {name}
          </EuiTab>
        ))}
      </EuiTabs>

      {table && (
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiSearchBar
            query={search}
            box={{
              incremental: true,
              placeholder: i18n.translate(
                'xpack.enterpriseSearch.analytics.collectionsView.explorer.searchPlaceholder',
                {
                  defaultMessage: 'Search',
                }
              ),
            }}
            onChange={({ queryText }) => setSearch(queryText)}
          />

          <EuiSpacer size="xl" />

          <EuiText size="xs">
            <FormattedMessage
              id="xpack.enterpriseSearch.analytics.collectionsView.explorer.tableSummary"
              defaultMessage="Showing {items} of {totalItemsCount}"
              values={{
                items: (
                  <strong>
                    {pageSize * pageIndex + Number(!!items.length)}-
                    {pageSize * pageIndex + items.length}
                  </strong>
                ),
                totalItemsCount,
              }}
            />
          </EuiText>

          <EuiSpacer size="m" />

          <EuiHorizontalRule margin="none" />

          <EuiBasicTable
            columns={table.columns}
            itemId={selectedTable || undefined}
            items={items}
            loading={isLoading}
            sorting={table.sorting}
            pagination={{
              pageIndex,
              pageSize,
              pageSizeOptions: [10, 20, 50],
              showPerPageOptions: true,
              totalItemCount: totalItemsCount,
            }}
            onChange={onTableChange}
          />
        </EuiFlexGroup>
      )}
    </EuiFlexGroup>
  );
};
