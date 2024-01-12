/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { orderBy, isEqual } from 'lodash';

import {
  useEuiBackgroundColor,
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiTableSortingType,
  EuiText,
  EuiToolTip,
  RIGHT_ALIGNMENT,
  useEuiTheme,
  euiPaletteColorBlind,
} from '@elastic/eui';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SignificantItem } from '@kbn/ml-agg-utils';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import type { DataView } from '@kbn/data-views-plugin/public';

import { MiniHistogram } from '../mini_histogram';

import { getFailedTransactionsCorrelationImpactLabel } from './get_failed_transactions_correlation_impact_label';
import { LogRateAnalysisResultsTable } from './log_rate_analysis_results_table';
import { useLogRateAnalysisResultsTableRowContext } from './log_rate_analysis_results_table_row_provider';
import type { GroupTableItem } from './types';
import { useCopyToClipboardAction } from './use_copy_to_clipboard_action';
import { useViewInDiscoverAction } from './use_view_in_discover_action';
import { useViewInLogPatternAnalysisAction } from './use_view_in_log_pattern_analysis_action';

const NARROW_COLUMN_WIDTH = '120px';
const EXPAND_COLUMN_WIDTH = '40px';
const ACTIONS_COLUMN_WIDTH = '60px';
const NOT_AVAILABLE = '--';
const MAX_GROUP_BADGES = 5;

const PAGINATION_SIZE_OPTIONS = [5, 10, 20, 50];
const DEFAULT_SORT_FIELD = 'pValue';
const DEFAULT_SORT_FIELD_ZERO_DOCS_FALLBACK = 'docCount';
const DEFAULT_SORT_DIRECTION = 'asc';
const DEFAULT_SORT_DIRECTION_ZERO_DOCS_FALLBACK = 'desc';

interface LogRateAnalysisResultsTableProps {
  significantItems: SignificantItem[];
  groupTableItems: GroupTableItem[];
  loading: boolean;
  searchQuery: estypes.QueryDslQueryContainer;
  timeRangeMs: TimeRangeMs;
  dataView: DataView;
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
  zeroDocsFallback?: boolean;
}

export const LogRateAnalysisResultsGroupsTable: FC<LogRateAnalysisResultsTableProps> = ({
  significantItems,
  groupTableItems,
  loading,
  dataView,
  timeRangeMs,
  searchQuery,
  barColorOverride,
  barHighlightColorOverride,
  zeroDocsFallback = false,
}) => {
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

  const { pinnedGroup, selectedGroup, setPinnedGroup, setSelectedGroup } =
    useLogRateAnalysisResultsTableRowContext();
  const dataViewId = dataView.id;

  const toggleDetails = (item: GroupTableItem) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMapValues[item.id]) {
      delete itemIdToExpandedRowMapValues[item.id];
    } else {
      itemIdToExpandedRowMapValues[item.id] = (
        <LogRateAnalysisResultsTable
          significantItems={item.groupItemsSortedByUniqueness.reduce<SignificantItem[]>(
            (p, groupItem) => {
              const st = significantItems.find(
                (d) => d.fieldName === groupItem.fieldName && d.fieldValue === groupItem.fieldValue
              );

              if (st !== undefined) {
                p.push({
                  ...st,
                  unique: (groupItem.duplicate ?? 0) <= 1,
                });
              }

              return p;
            },
            []
          )}
          loading={loading}
          isExpandedRow
          dataView={dataView}
          timeRangeMs={timeRangeMs}
          searchQuery={searchQuery}
          barColorOverride={barColorOverride}
          barHighlightColorOverride={barHighlightColorOverride}
        />
      );
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const copyToClipBoardAction = useCopyToClipboardAction();
  const viewInDiscoverAction = useViewInDiscoverAction(dataViewId);
  const viewInLogPatternAnalysisAction = useViewInLogPatternAnalysisAction(dataViewId);

  const columns: Array<EuiBasicTableColumn<GroupTableItem>> = [
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
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.logRateAnalysis.resultsTableGroups.groupColumnTooltip',
            {
              defaultMessage:
                'Displays up to {maxItemCount} group items sorted by uniqueness and document count. Expand row to see all field/value pairs.',
              values: { maxItemCount: MAX_GROUP_BADGES },
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.logRateAnalysis.resultsTableGroups.groupLabel"
              defaultMessage="Group"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      render: (_, { uniqueItemsCount, groupItemsSortedByUniqueness }) => {
        const valuesBadges = [];

        for (const groupItem of groupItemsSortedByUniqueness) {
          const { fieldName, fieldValue, duplicate } = groupItem;
          if (valuesBadges.length >= MAX_GROUP_BADGES) break;
          valuesBadges.push(
            <span key={`${fieldName}-id`}>
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
      textOnly: true,
      valign: 'top',
    },
    {
      'data-test-subj': 'aiopsLogRateAnalysisResultsGroupsTableColumnLogRate',
      width: NARROW_COLUMN_WIDTH,
      field: 'pValue',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.logRateAnalysis.resultsTableGroups.logRateColumnTooltip',
            {
              defaultMessage:
                'A visual representation of the impact of the group on the message rate difference.',
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.logRateAnalysis.resultsTableGroups.logRateLabel"
              defaultMessage="Log rate"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      render: (_, { histogram, id }) => (
        <MiniHistogram
          chartData={histogram}
          isLoading={loading && histogram === undefined}
          label={i18n.translate('xpack.aiops.logRateAnalysis.resultsTableGroups.groupLabel', {
            defaultMessage: 'Group',
          })}
          barColorOverride={barColorOverride}
          barHighlightColorOverride={barHighlightColorOverride}
        />
      ),
      sortable: false,
      valign: 'top',
    },
    {
      'data-test-subj': 'aiopsLogRateAnalysisResultsGroupsTableColumnDocCount',
      width: NARROW_COLUMN_WIDTH,
      field: 'docCount',
      name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.docCountLabel', {
        defaultMessage: 'Doc count',
      }),
      sortable: true,
      valign: 'top',
    },
  ];

  if (!zeroDocsFallback) {
    columns.push({
      'data-test-subj': 'aiopsLogRateAnalysisResultsGroupsTableColumnPValue',
      width: NARROW_COLUMN_WIDTH,
      field: 'pValue',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.logRateAnalysis.resultsTableGroups.pValueColumnTooltip',
            {
              defaultMessage:
                'The significance of changes in the frequency of values; lower values indicate greater change; sorting this column will automatically do a secondary sort on the doc count column.',
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.logRateAnalysis.resultsTableGroups.pValueLabel"
              defaultMessage="p-value"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      render: (pValue: number | null) => pValue?.toPrecision(3) ?? NOT_AVAILABLE,
      sortable: true,
      valign: 'top',
    });

    columns.push({
      'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnImpact',
      width: NARROW_COLUMN_WIDTH,
      field: 'pValue',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.logRateAnalysis.resultsTableGroups.impactLabelColumnTooltip',
            {
              defaultMessage: 'The level of impact of the group on the message rate difference',
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.logRateAnalysis.resultsTableGroups.impactLabel"
              defaultMessage="Impact"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      render: (_, { pValue }) => {
        if (!pValue) return NOT_AVAILABLE;
        const label = getFailedTransactionsCorrelationImpactLabel(pValue);
        return label ? <EuiBadge color={label.color}>{label.impact}</EuiBadge> : null;
      },
      sortable: true,
      valign: 'top',
    });
  }

  columns.push({
    'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnAction',
    name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.actionsColumnName', {
      defaultMessage: 'Actions',
    }),
    actions: [
      ...(viewInDiscoverAction ? [viewInDiscoverAction] : []),
      ...(viewInLogPatternAnalysisAction ? [viewInLogPatternAnalysisAction] : []),
      copyToClipBoardAction,
    ],
    width: ACTIONS_COLUMN_WIDTH,
    valign: 'top',
  });

  const onChange = useCallback((tableSettings) => {
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
      setSelectedGroup(pageOfItems[0]);
    }

    // If a user switched pages and a pinned row is no longer visible
    // on the current page, set the status of pinned rows back to `null`.
    if (pinnedGroup !== null && !pageOfItems.some((item) => isEqual(item, pinnedGroup))) {
      setPinnedGroup(null);
    }
  }, [selectedGroup, setSelectedGroup, setPinnedGroup, pageOfItems, pinnedGroup]);

  // When the analysis results table unmounts,
  // make sure to reset any hovered or pinned rows.
  useEffect(
    () => () => {
      setSelectedGroup(null);
      setPinnedGroup(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
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
      columns={columns}
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
              setPinnedGroup(null);
            } else {
              setPinnedGroup(group);
            }
          },
          onMouseEnter: () => {
            if (pinnedGroup === null) {
              setSelectedGroup(group);
            }
          },
          onMouseLeave: () => {
            setSelectedGroup(null);
          },
          style: getRowStyle(group),
        };
      }}
    />
  );
};
