/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  Criteria,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiI18nNumber,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import {
  EuiTableFieldDataColumnType,
  EuiTableSortingType,
} from '@elastic/eui/src/components/basic_table/table_types';
import { UseEuiTheme } from '@elastic/eui/src/services/theme/hooks';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { getFlag } from '../../../utils/get_flag';
import { AnalyticsCollectionExploreTableLogic } from '../analytics_collection_explore_table_logic';
import {
  ExploreTableColumns,
  ExploreTableItem,
  ExploreTables,
  SearchTermsTable,
  ClickedTable,
  ReferrersTable,
  WorsePerformersTable,
  LocationsTable,
} from '../analytics_collection_explore_table_types';

import { AnalyticsCollectionExplorerCallout } from './analytics_collection_explorer_callout';

interface TableSetting<T extends object = ExploreTableItem, K extends object = T> {
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
    id: ExploreTables.Clicked,
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
    id: ExploreTables.Locations,
    name: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.explorer.locationsTab',
      { defaultMessage: 'Locations' }
    ),
  },
  {
    id: ExploreTables.Referrers,
    name: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.explorer.referrersTab',
      { defaultMessage: 'Referrers' }
    ),
  },
];

const tableSettings: {
  [ExploreTables.Clicked]: TableSetting<ClickedTable>;
  [ExploreTables.Locations]: TableSetting<LocationsTable>;
  [ExploreTables.Referrers]: TableSetting<ReferrersTable>;
  [ExploreTables.SearchTerms]: TableSetting<SearchTermsTable>;
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
  [ExploreTables.Clicked]: {
    columns: [
      // @ts-expect-error @types/react@18 - Type '(value: string) => React.JSX.Element' is not assignable to type 'ReactNode'
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
  [ExploreTables.Referrers]: {
    columns: [
      // @ts-expect-error @types/react@18 - Type '(value: string) => React.JSX.Element' is not assignable to type 'ReactNode'
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
  [ExploreTables.Locations]: {
    columns: [
      // @ts-expect-error @types/react@18 - Type '(value: string) => React.JSX.Element' is not assignable to type 'ReactNode'
      {
        field: ExploreTableColumns.location,
        name: i18n.translate(
          'xpack.enterpriseSearch.analytics.collections.collectionsView.exploreTable.location',
          { defaultMessage: 'Location' }
        ),
        render: (euiTheme: UseEuiTheme['euiTheme']) => (value: string, data: LocationsTable) =>
          (
            <EuiFlexGroup gutterSize="m" alignItems="center">
              <EuiText>
                <h3>{getFlag(data.countryISOCode)}</h3>
              </EuiText>
              <EuiText size="s" color={euiTheme.colors.primaryText}>
                <p>{value}</p>
              </EuiText>
            </EuiFlexGroup>
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
const MAX_ITEMS = 10000;

export const AnalyticsCollectionExplorerTable = () => {
  const { euiTheme } = useEuiTheme();
  const { onTableChange, setSelectedTable, setSearch } = useActions(
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
  const handleTableChange = ({ sort, page }: Criteria<ExploreTableItem>) => {
    onTableChange({ page, sort });
  };
  const startNumberItemsOnPage = pageSize * pageIndex + (items.length ? 1 : 0);
  const endNumberItemsOnPage = pageSize * pageIndex + items.length;

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
          <EuiFieldSearch
            placeholder={i18n.translate(
              'xpack.enterpriseSearch.analytics.collectionsView.explorer.searchPlaceholder',
              {
                defaultMessage: 'Search',
              }
            )}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            isClearable
            isLoading={isLoading}
            incremental
            fullWidth
          />

          <EuiSpacer size="xl" />

          <EuiText size="xs">
            {totalItemsCount > MAX_ITEMS ? (
              <FormattedMessage
                id="xpack.enterpriseSearch.analytics.collectionsView.explorer.tableSummaryIndeterminate"
                defaultMessage="Showing {items} of first {maxItemsCount} results"
                values={{
                  items: (
                    <strong>
                      {startNumberItemsOnPage}-{endNumberItemsOnPage}
                    </strong>
                  ),
                  maxItemsCount: <EuiI18nNumber value={MAX_ITEMS} />,
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.enterpriseSearch.analytics.collectionsView.explorer.tableSummary"
                defaultMessage="Showing {items} of {totalItemsCount}"
                values={{
                  items: (
                    <strong>
                      {startNumberItemsOnPage}-{endNumberItemsOnPage}
                    </strong>
                  ),
                  totalItemsCount,
                }}
              />
            )}
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
              totalItemCount: Math.min(totalItemsCount, MAX_ITEMS),
            }}
            onChange={handleTableChange}
          />
        </EuiFlexGroup>
      )}

      <AnalyticsCollectionExplorerCallout />
    </EuiFlexGroup>
  );
};
