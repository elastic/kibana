/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { orderBy, isEqual } from 'lodash';

import type { EuiBasicTableColumn, EuiTableSortingType } from '@elastic/eui';
import {
  useEuiBackgroundColor,
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  EuiIconTip,
  RIGHT_ALIGNMENT,
  useEuiTheme,
  euiPaletteColorBlind,
} from '@elastic/eui';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { type SignificantItem } from '@kbn/ml-agg-utils';
import {
  setPinnedGroup,
  setSelectedGroup,
  useAppDispatch,
  useAppSelector,
  type GroupTableItem,
} from '@kbn/aiops-log-rate-analysis/state';
import { stringHash } from '@kbn/ml-string-hash';

import usePrevious from 'react-use/lib/usePrevious';
import useMountedState from 'react-use/lib/useMountedState';

import { LogRateAnalysisResultsTable } from './log_rate_analysis_results_table';
import { LOG_RATE_ANALYSIS_RESULTS_TABLE_TYPE, useColumns } from './use_columns';

const EXPAND_COLUMN_WIDTH = '40px';
const MAX_GROUP_BADGES = 5;

const PAGINATION_SIZE_OPTIONS = [5, 10, 20, 50];
const DEFAULT_SORT_FIELD = 'pValue';
const DEFAULT_SORT_FIELD_ZERO_DOCS_FALLBACK = 'docCount';
const DEFAULT_SORT_DIRECTION = 'asc';
const DEFAULT_SORT_DIRECTION_ZERO_DOCS_FALLBACK = 'desc';

interface LogRateAnalysisResultsTableProps {
  skippedColumns: string[];
  significantItems: SignificantItem[];
  groupTableItems: GroupTableItem[];
  searchQuery: estypes.QueryDslQueryContainer;
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
}

export const LogRateAnalysisResultsGroupsTable: FC<LogRateAnalysisResultsTableProps> = ({
  skippedColumns,
  significantItems,
  groupTableItems,
  searchQuery,
  barColorOverride,
  barHighlightColorOverride,
}) => {
  const prevSkippedColumns = usePrevious(skippedColumns);

  const zeroDocsFallback = useAppSelector((s) => s.logRateAnalysisResults.zeroDocsFallback);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<'docCount' | 'pValue'>(
    zeroDocsFallback ? DEFAULT_SORT_FIELD_ZERO_DOCS_FALLBACK : DEFAULT_SORT_FIELD
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    zeroDocsFallback ? DEFAULT_SORT_DIRECTION_ZERO_DOCS_FALLBACK : DEFAULT_SORT_DIRECTION
  );
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );

  const { euiTheme } = useEuiTheme();
  const visColors = euiPaletteColorBlind();
  const primaryBackgroundColor = useEuiBackgroundColor('primary');

  const pinnedGroup = useAppSelector((s) => s.logRateAnalysisTableRow.pinnedGroup);
  const selectedGroup = useAppSelector((s) => s.logRateAnalysisTableRow.selectedGroup);
  const dispatch = useAppDispatch();
  const isMounted = useMountedState();

  const toggleDetails = (item: GroupTableItem) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMapValues[item.id]) {
      delete itemIdToExpandedRowMapValues[item.id];
    } else {
      itemIdToExpandedRowMapValues[item.id] = (
        <LogRateAnalysisResultsTable
          skippedColumns={skippedColumns}
          groupFilter={item.groupItemsSortedByUniqueness}
          searchQuery={searchQuery}
          barColorOverride={barColorOverride}
          barHighlightColorOverride={barHighlightColorOverride}
        />
      );
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const groupColumns: Array<EuiBasicTableColumn<GroupTableItem>> = [
    {
      align: RIGHT_ALIGNMENT,
      width: EXPAND_COLUMN_WIDTH,
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.expandRowsLabel', {
              defaultMessage: 'Expand rows',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
      render: (item: GroupTableItem) => (
        <EuiButtonIcon
          data-test-subj={'aiopsLogRateAnalysisResultsGroupsTableRowExpansionButton'}
          onClick={() => toggleDetails(item)}
          aria-label={
            itemIdToExpandedRowMap[item.id]
              ? i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.collapseAriaLabel', {
                  defaultMessage: 'Collapse',
                })
              : i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.expandAriaLabel', {
                  defaultMessage: 'Expand',
                })
          }
          iconType={itemIdToExpandedRowMap[item.id] ? 'arrowDown' : 'arrowRight'}
        />
      ),
      valign: 'top',
    },
    {
      'data-test-subj': 'aiopsLogRateAnalysisResultsGroupsTableColumnGroup',
      field: 'group',
      width: skippedColumns.length < 3 ? '34%' : '50%',
      name: (
        <>
          <FormattedMessage
            id="xpack.aiops.logRateAnalysis.resultsTableGroups.groupLabel"
            defaultMessage="Group"
          />
          &nbsp;
          <EuiIconTip
            position="top"
            size="s"
            color="subdued"
            type="questionInCircle"
            className="eui-alignTop"
            content={i18n.translate(
              'xpack.aiops.logRateAnalysis.resultsTableGroups.groupColumnTooltip',
              {
                defaultMessage:
                  'Displays up to {maxItemCount} group items sorted by uniqueness and document count. Expand row to see all field/value pairs.',
                values: { maxItemCount: MAX_GROUP_BADGES },
              }
            )}
          />
        </>
      ),
      render: (_, { uniqueItemsCount, groupItemsSortedByUniqueness }) => {
        const valuesBadges: React.ReactNode[] = [];

        for (const groupItem of groupItemsSortedByUniqueness) {
          const { fieldName, fieldValue, duplicate } = groupItem;
          if (valuesBadges.length >= MAX_GROUP_BADGES) break;
          valuesBadges.push(
            <span key={`${stringHash(`${fieldName}:${fieldValue}`)}-id`}>
              <EuiBadge
                data-test-subj="aiopsLogRateAnalysisResultsTableColumnGroupBadge"
                color="hollow"
              >
                <span>
                  {(duplicate ?? 0) <= 1 ? '* ' : ''}
                  {`${fieldName}: `}
                </span>
                <span style={{ color: visColors[2] }}>{`${fieldValue}`}</span>
              </EuiBadge>
              <EuiSpacer size="xs" />
            </span>
          );
        }

        if (groupItemsSortedByUniqueness.length > MAX_GROUP_BADGES) {
          valuesBadges.push(
            <EuiText
              key={`group-info-id`}
              data-test-subj="aiopsLogRateAnalysisResultsGroupsTableColumnGroupInfo"
              color="subdued"
              size="xs"
            >
              <FormattedMessage
                id="xpack.aiops.logRateAnalysis.resultsTableGroups.groupItemsInfo"
                defaultMessage="Showing {valuesBadges} out of {count} items."
                values={{
                  count: groupItemsSortedByUniqueness.length,
                  valuesBadges: valuesBadges.length,
                }}
              />
              {uniqueItemsCount > MAX_GROUP_BADGES ? (
                <>
                  {' '}
                  <FormattedMessage
                    id="xpack.aiops.logRateAnalysis.resultsTableGroups.groupUniqueItemsInfo"
                    defaultMessage="{count, plural, one {# item} other {# items}} unique to this group."
                    values={{
                      count: uniqueItemsCount,
                    }}
                  />
                </>
              ) : null}
            </EuiText>
          );
        }

        return valuesBadges;
      },
      sortable: false,
      truncateText: true,
      valign: 'top',
    },
  ];

  const columns = useColumns(
    LOG_RATE_ANALYSIS_RESULTS_TABLE_TYPE.GROUPS,
    skippedColumns,
    searchQuery,
    barColorOverride,
    barHighlightColorOverride
  ) as Array<EuiBasicTableColumn<GroupTableItem>>;

  groupColumns.push(...columns);

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
    const itemCount = groupTableItems?.length ?? 0;

    let items = groupTableItems ?? [];

    const sortIteratees = [
      (item: GroupTableItem) => {
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
      sortIteratees.push((item: GroupTableItem) => item.docCount);
      sortDirections.push(sortDirection);
    }

    items = orderBy(groupTableItems, sortIteratees, sortDirections);

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
  }, [pageIndex, pageSize, sortField, sortDirection, groupTableItems]);

  useEffect(() => {
    // If no row is hovered or pinned or the user switched to a new page,
    // fall back to set the first row into a hovered state to make the
    // main document count chart show a comparison view by default.
    if (
      (selectedGroup === null || !pageOfItems.some((item) => isEqual(item, selectedGroup))) &&
      pinnedGroup === null &&
      pageOfItems.length > 0
    ) {
      dispatch(setSelectedGroup(pageOfItems[0]));
    }

    // If a user switched pages and a pinned row is no longer visible
    // on the current page, set the status of pinned rows back to `null`.
    if (pinnedGroup !== null && !pageOfItems.some((item) => isEqual(item, pinnedGroup))) {
      dispatch(setPinnedGroup(null));
    }
  }, [dispatch, selectedGroup, pageOfItems, pinnedGroup]);

  // When the analysis results table unmounts,
  // make sure to reset any hovered or pinned rows.
  useEffect(
    () => () => {
      dispatch(setSelectedGroup(null));
      dispatch(setPinnedGroup(null));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(
    function updateVisbleColumnsInExpandedRows() {
      // Update the itemIdToExpandedRowMap results table component for each expanded row with the updated skippedColumns prop
      // Update the itemIdToExpandedRowMap state after we update the components
      if (
        isMounted() &&
        prevSkippedColumns &&
        prevSkippedColumns !== skippedColumns &&
        Object.keys(itemIdToExpandedRowMap)?.length > 0
      ) {
        const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
        for (const itemId in itemIdToExpandedRowMapValues) {
          if (Object.hasOwn(itemIdToExpandedRowMapValues, itemId)) {
            const component = itemIdToExpandedRowMapValues[itemId];
            itemIdToExpandedRowMapValues[itemId] = (
              <LogRateAnalysisResultsTable {...component.props} skippedColumns={skippedColumns} />
            );
          }
        }
        setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prevSkippedColumns, skippedColumns, itemIdToExpandedRowMap]
  );

  const getRowStyle = (group: GroupTableItem) => {
    if (pinnedGroup && pinnedGroup.id === group.id) {
      return {
        backgroundColor: primaryBackgroundColor,
      };
    }

    if (selectedGroup && selectedGroup.id === group.id) {
      return {
        backgroundColor: euiTheme.colors.lightestShade,
      };
    }

    return {
      backgroundColor: euiTheme.colors.emptyShade,
    };
  };

  return (
    <EuiBasicTable
      data-test-subj="aiopsLogRateAnalysisResultsGroupsTable"
      compressed
      columns={groupColumns}
      items={pageOfItems}
      itemId="id"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      onChange={onChange}
      pagination={pagination.totalItemCount > pagination.pageSize ? pagination : undefined}
      loading={false}
      sorting={sorting as EuiTableSortingType<GroupTableItem>}
      rowProps={(group) => {
        return {
          'data-test-subj': `aiopsLogRateAnalysisResultsGroupsTableRow row-${group.id}`,
          onClick: () => {
            if (group.id === pinnedGroup?.id) {
              dispatch(setPinnedGroup(null));
            } else {
              dispatch(setPinnedGroup(group));
            }
          },
          onMouseEnter: () => {
            if (pinnedGroup === null) {
              dispatch(setSelectedGroup(group));
            }
          },
          onMouseLeave: () => {
            dispatch(setSelectedGroup(null));
          },
          style: getRowStyle(group),
        };
      }}
    />
  );
};
