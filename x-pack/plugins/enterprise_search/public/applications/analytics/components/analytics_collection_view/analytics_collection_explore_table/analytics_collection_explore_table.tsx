/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiFlexGroup,
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

import { generateEncodedPath } from '../../../../shared/encode_path_params';

import { KibanaLogic } from '../../../../shared/kibana';
import { COLLECTION_EXPLORER_PATH } from '../../../routes';
import { FilterBy } from '../../../utils/get_formula_by_filter';
import { FetchAnalyticsCollectionLogic } from '../fetch_analytics_collection_logic';

import { AnalyticsCollectionExplorerTablesLogic } from './analytics_collection_explore_table_logic';
import {
  ExploreTableColumns,
  ExploreTableItem,
  ExploreTables,
  SearchTermsTable,
  TopClickedTable,
  TopReferrersTable,
  WorsePerformersTable,
} from './analytics_collection_explore_table_types';

const tabsByFilter: Record<FilterBy, Array<{ id: ExploreTables; name: string }>> = {
  [FilterBy.Searches]: [
    {
      id: ExploreTables.SearchTerms,
      name: i18n.translate(
        'xpack.enterpriseSearch.analytics.collections.collectionsView.exploreTab.searchTerms',
        { defaultMessage: 'Popular search terms' }
      ),
    },
  ],
  [FilterBy.NoResults]: [
    {
      id: ExploreTables.WorsePerformers,
      name: i18n.translate(
        'xpack.enterpriseSearch.analytics.collections.collectionsView.exploreTab.worsePerformers',
        { defaultMessage: 'Worse performers' }
      ),
    },
  ],
  [FilterBy.Clicks]: [
    {
      id: ExploreTables.TopClicked,
      name: i18n.translate(
        'xpack.enterpriseSearch.analytics.collections.collectionsView.exploreTab.topClicked',
        { defaultMessage: 'Top clicked results' }
      ),
    },
  ],
  [FilterBy.Sessions]: [
    {
      id: ExploreTables.TopReferrers,
      name: i18n.translate(
        'xpack.enterpriseSearch.analytics.collections.collectionsView.exploreTab.topReferrers',
        { defaultMessage: 'Top referrers' }
      ),
    },
  ],
};

// const progressColumnsProps = {
//   css: { height: 40, padding: '0 8px 0 0' },
//   width: '90%',
//   render(value, record) {
//     return (
//       <EuiFlexItem css={{ height: '100%', position: 'relative' }}>
//         <EuiProgress
//           css={{ borderRadius: 'unset', height: '100%' }}
//           value={record.percentage}
//           max={100}
//           size="l"
//           color="#E6F1FA"
//           position="absolute"
//           label={
//             <EuiText
//               css={{ position: 'relative', zIndex: 1, paddingLeft: 8, paddingTop: 8 }}
//               size="s"
//             >
//               <p>{value}</p>
//             </EuiText>
//           }
//         />
//       </EuiFlexItem>
//     );
//   },
// };

interface TableSetting<T = ExploreTableItem, K = T> {
  columns: Array<
    EuiBasicTableColumn<T & K> & {
      render?: (euiTheme: UseEuiTheme['euiTheme']) => EuiTableFieldDataColumnType<T & K>['render'];
    }
  >;
  sorting: EuiTableSortingType<T>;
  // transformItems?: (items: T[]) => K[];
}

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
        truncateText: true,
        // ...progressColumnsProps,
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
      readOnly: true,
      sort: {
        direction: 'desc',
        field: ExploreTableColumns.count,
      },
    },
    // transformItems: (items) => {
    //   const countMax = items.reduce((res, item) => res + item[ExploreTableColumns.count], 0);
    //   return items.map((item) => ({
    //     ...item,
    //     [ExploreTableColumns.searchTerms]: `"${item[ExploreTableColumns.searchTerms]}"`,
    //     percentage: Math.round((item.count / countMax) * 100),
    //   }));
    // },
  },
  [ExploreTables.WorsePerformers]: {
    columns: [
      {
        field: ExploreTableColumns.query,
        name: i18n.translate(
          'xpack.enterpriseSearch.analytics.collections.collectionsView.exploreTable.query',
          { defaultMessage: 'Query' }
        ),
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
      readOnly: true,
      sort: {
        direction: 'desc',
        field: ExploreTableColumns.count,
      },
    },
    // transformItems: (items: WorsePerformersTable[]) => {
    //   const countMax = items.reduce((res, item) => res + item[ExploreTableColumns.count], 0);
    //   return items.map((item) => ({
    //     ...item,
    //     [ExploreTableColumns.query]: `"${item[ExploreTableColumns.query]}"`,
    //     percentage: Math.round((item.count / countMax) * 100),
    //   }));
    // },
  },
  [ExploreTables.TopClicked]: {
    columns: [
      {
        field: ExploreTableColumns.page,
        name: i18n.translate(
          'xpack.enterpriseSearch.analytics.collections.collectionsView.exploreTable.page',
          { defaultMessage: 'Page' }
        ),
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
      readOnly: true,
      sort: {
        direction: 'desc',
        field: ExploreTableColumns.count,
      },
    },
    // transformItems: (items) => {
    //   const countMax = items.reduce((res, item) => res + item[ExploreTableColumns.count], 0);
    //   return items.map((item) => ({
    //     ...item,
    //     percentage: Math.round((item.count / countMax) * 100),
    //   }));
    // },
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
      readOnly: true,
      sort: {
        direction: 'desc',
        field: ExploreTableColumns.sessions,
      },
    },
  },
};

interface AnalyticsCollectionExploreTableProps {
  filterBy: FilterBy;
}

export const AnalyticsCollectionExploreTable: React.FC<AnalyticsCollectionExploreTableProps> = ({
  filterBy,
}) => {
  const { euiTheme } = useEuiTheme();
  const { navigateToUrl } = useValues(KibanaLogic);
  const { analyticsCollection } = useValues(FetchAnalyticsCollectionLogic);
  const { findDataView, setSelectedTable, setSorting } = useActions(
    AnalyticsCollectionExplorerTablesLogic
  );
  const { items, isLoading, selectedTable, sorting } = useValues(
    AnalyticsCollectionExplorerTablesLogic
  );
  const tabs = tabsByFilter[filterBy];

  useEffect(() => {
    findDataView(analyticsCollection);
  }, [analyticsCollection]);

  useEffect(() => {
    const firstTableInTabsId = tabs[0].id;

    setSelectedTable(
      firstTableInTabsId,
      (tableSettings[firstTableInTabsId] as TableSetting)?.sorting?.sort
    );
  }, [tabs]);

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

      {useMemo(() => {
        const table = selectedTable !== null && (tableSettings[selectedTable] as TableSetting);

        return (
          table && (
            <EuiBasicTable
              columns={
                table.columns.map((column) => ({
                  ...column,
                  render: column.render?.(euiTheme),
                })) as TableSetting['columns']
              }
              itemId={selectedTable}
              items={items}
              loading={isLoading}
              sorting={table.sorting}
              onChange={({ sort }) => {
                setSorting(sort);
              }}
            />
          )
        );
      }, [selectedTable, sorting, items, isLoading])}

      <EuiFlexGroup>
        <EuiButton
          fill
          onClick={() =>
            navigateToUrl(
              generateEncodedPath(COLLECTION_EXPLORER_PATH, {
                name: analyticsCollection.name,
              })
            )
          }
        >
          <FormattedMessage
            id="xpack.enterpriseSearch.analytics.collections.collectionsView.list.exploreButton"
            defaultMessage="Explore all"
          />
        </EuiButton>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
