/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { orderBy, isEqual } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { EuiTableSortingType } from '@elastic/eui';
import { useEuiBackgroundColor, EuiBasicTable } from '@elastic/eui';

import type { SignificantItem } from '@kbn/ml-agg-utils';
import {
  setPinnedSignificantItem,
  setSelectedSignificantItem,
  useAppDispatch,
  useAppSelector,
} from '@kbn/aiops-log-rate-analysis/state';

import type { GroupTableItemGroup } from '@kbn/aiops-log-rate-analysis/state';
import { useEuiTheme } from '../../hooks/use_eui_theme';
import { useColumns, LOG_RATE_ANALYSIS_RESULTS_TABLE_TYPE } from './use_columns';

const PAGINATION_SIZE_OPTIONS = [5, 10, 20, 50];
const DEFAULT_SORT_FIELD = 'pValue';
const DEFAULT_SORT_FIELD_ZERO_DOCS_FALLBACK = 'doc_count';
const DEFAULT_SORT_DIRECTION = 'asc';
const DEFAULT_SORT_DIRECTION_ZERO_DOCS_FALLBACK = 'desc';

interface LogRateAnalysisResultsTableProps {
  groupFilter?: GroupTableItemGroup[];
  searchQuery: estypes.QueryDslQueryContainer;
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
  skippedColumns: string[];
}

export const LogRateAnalysisResultsTable: FC<LogRateAnalysisResultsTableProps> = ({
  groupFilter,
  searchQuery,
  barColorOverride,
  barHighlightColorOverride,
  skippedColumns,
}) => {
  const euiTheme = useEuiTheme();
  const primaryBackgroundColor = useEuiBackgroundColor('primary');

  const allSignificantItems = useAppSelector((s) => s.logRateAnalysisResults.significantItems);

  const significantItems = useMemo(() => {
    if (!groupFilter) {
      return allSignificantItems;
    }

    return groupFilter.reduce<SignificantItem[]>((p, groupItem) => {
      const st = allSignificantItems.find(
        (d) => d.fieldName === groupItem.fieldName && d.fieldValue === groupItem.fieldValue
      );

      if (st !== undefined) {
        p.push({
          ...st,
          unique: (groupItem.duplicate ?? 0) <= 1,
        });
      }

      return p;
    }, []);
  }, [allSignificantItems, groupFilter]);

  const zeroDocsFallback = useAppSelector((s) => s.logRateAnalysisResults.zeroDocsFallback);
  const pinnedGroup = useAppSelector((s) => s.logRateAnalysisTableRow.pinnedGroup);
  const selectedGroup = useAppSelector((s) => s.logRateAnalysisTableRow.selectedGroup);
  const pinnedSignificantItem = useAppSelector(
    (s) => s.logRateAnalysisTableRow.pinnedSignificantItem
  );
  const selectedSignificantItem = useAppSelector(
    (s) => s.logRateAnalysisTableRow.selectedSignificantItem
  );

  const dispatch = useAppDispatch();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof SignificantItem>(
    zeroDocsFallback ? DEFAULT_SORT_FIELD_ZERO_DOCS_FALLBACK : DEFAULT_SORT_FIELD
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    zeroDocsFallback ? DEFAULT_SORT_DIRECTION_ZERO_DOCS_FALLBACK : DEFAULT_SORT_DIRECTION
  );

  const columns = useColumns(
    LOG_RATE_ANALYSIS_RESULTS_TABLE_TYPE.SIGNIFICANT_ITEMS,
    skippedColumns,
    searchQuery,
    barColorOverride,
    barHighlightColorOverride,
    groupFilter !== undefined
  );

  const onChange = useCallback((tableSettings: any) => {
    if (tableSettings.page) {
      const { index, size } = tableSettings.page;
      setPageIndex(index);
      setPageSize(size);
    }

    if (tableSettings.sort) {
      const { field, direction } = tableSettings.sort;
      setSortField(field);
      setSortDirection(direction);
    }
  }, []);

  const { pagination, pageOfItems, sorting } = useMemo(() => {
    const pageStart = pageIndex * pageSize;
    const itemCount = significantItems?.length ?? 0;

    let items: SignificantItem[] = significantItems ?? [];

    const sortIteratees = [
      (item: SignificantItem) => {
        if (item && typeof item[sortField] === 'string') {
          // @ts-ignore Object is possibly null or undefined
          return item[sortField].toLowerCase();
        }
        return item[sortField];
      },
    ];
    const sortDirections = [sortDirection];

    // Only if the table is sorted by p-value, add a secondary sort by doc count.
    if (sortField === 'pValue') {
      sortIteratees.push((item: SignificantItem) => item.doc_count);
      sortDirections.push(sortDirection);
    }

    items = orderBy(significantItems, sortIteratees, sortDirections);

    return {
      pageOfItems: items.slice(pageStart, pageStart + pageSize),
      pagination: {
        pageIndex,
        pageSize,
        totalItemCount: itemCount,
        pageSizeOptions: PAGINATION_SIZE_OPTIONS,
      },
      sorting: {
        sort: {
          field: sortField,
          direction: sortDirection,
        },
      },
    };
  }, [pageIndex, pageSize, sortField, sortDirection, significantItems]);

  useEffect(() => {
    // If no row is hovered or pinned or the user switched to a new page,
    // fall back to set the first row into a hovered state to make the
    // main document count chart show a comparison view by default.
    if (
      (selectedSignificantItem === null ||
        !pageOfItems.some((item) => isEqual(item, selectedSignificantItem))) &&
      pinnedSignificantItem === null &&
      pageOfItems.length > 0 &&
      selectedGroup === null &&
      pinnedGroup === null
    ) {
      dispatch(setSelectedSignificantItem(pageOfItems[0]));
    }

    // If a user switched pages and a pinned row is no longer visible
    // on the current page, set the status of pinned rows back to `null`.
    if (
      pinnedSignificantItem !== null &&
      !pageOfItems.some((item) => isEqual(item, pinnedSignificantItem)) &&
      selectedGroup === null &&
      pinnedGroup === null
    ) {
      dispatch(setPinnedSignificantItem(null));
    }
  }, [
    dispatch,
    selectedGroup,
    selectedSignificantItem,
    pageOfItems,
    pinnedGroup,
    pinnedSignificantItem,
  ]);

  // When the analysis results table unmounts,
  // make sure to reset any hovered or pinned rows.
  useEffect(
    () => () => {
      dispatch(setSelectedSignificantItem(null));
      dispatch(setPinnedSignificantItem(null));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const getRowStyle = (significantItem: SignificantItem) => {
    if (
      pinnedSignificantItem &&
      pinnedSignificantItem.fieldName === significantItem.fieldName &&
      pinnedSignificantItem.fieldValue === significantItem.fieldValue
    ) {
      return {
        backgroundColor: primaryBackgroundColor,
      };
    }

    if (
      selectedSignificantItem &&
      selectedSignificantItem.fieldName === significantItem.fieldName &&
      selectedSignificantItem.fieldValue === significantItem.fieldValue
    ) {
      return {
        backgroundColor: euiTheme.euiColorLightestShade,
      };
    }

    return {
      backgroundColor: euiTheme.euiColorEmptyShade,
    };
  };

  // Don't pass on the `loading` state to the table itself because
  // it disables hovering events. Because the mini histograms take a while
  // to load, hovering would not update the main chart. Instead,
  // the loading state is shown by the progress bar on the outer component level.
  // The outer component also will display a prompt when no data was returned
  // running the analysis and will hide this table.

  return (
    <EuiBasicTable
      data-test-subj="aiopsLogRateAnalysisResultsTable"
      compressed
      columns={columns}
      items={pageOfItems}
      onChange={onChange}
      pagination={pagination.totalItemCount > pagination.pageSize ? pagination : undefined}
      loading={false}
      sorting={sorting as EuiTableSortingType<SignificantItem>}
      rowProps={(significantItem) => {
        return {
          'data-test-subj': `aiopsLogRateAnalysisResultsTableRow row-${significantItem.fieldName}-${significantItem.fieldValue}`,
          onClick: () => {
            if (
              significantItem.fieldName === pinnedSignificantItem?.fieldName &&
              significantItem.fieldValue === pinnedSignificantItem?.fieldValue
            ) {
              dispatch(setPinnedSignificantItem(null));
            } else {
              dispatch(setPinnedSignificantItem(significantItem));
            }
          },
          onMouseEnter: () => {
            if (pinnedSignificantItem === null) {
              dispatch(setSelectedSignificantItem(significantItem));
            }
          },
          onMouseLeave: () => {
            dispatch(setSelectedSignificantItem(null));
          },
          style: getRowStyle(significantItem),
        };
      }}
    />
  );
};
