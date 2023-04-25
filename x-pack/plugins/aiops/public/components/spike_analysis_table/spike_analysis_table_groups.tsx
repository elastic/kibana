/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo, useState } from 'react';
import { sortBy } from 'lodash';

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
import type { SignificantTerm } from '@kbn/ml-agg-utils';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import type { DataView } from '@kbn/data-views-plugin/public';

import { MiniHistogram } from '../mini_histogram';

import { getFailedTransactionsCorrelationImpactLabel } from './get_failed_transactions_correlation_impact_label';
import { SpikeAnalysisTable } from './spike_analysis_table';
import { useSpikeAnalysisTableRowContext } from './spike_analysis_table_row_provider';
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
const DEFAULT_SORT_DIRECTION = 'asc';

interface SpikeAnalysisTableProps {
  significantTerms: SignificantTerm[];
  groupTableItems: GroupTableItem[];
  loading: boolean;
  searchQuery: estypes.QueryDslQueryContainer;
  timeRangeMs: TimeRangeMs;
  dataView: DataView;
}

export const SpikeAnalysisGroupsTable: FC<SpikeAnalysisTableProps> = ({
  significantTerms,
  groupTableItems,
  loading,
  dataView,
  timeRangeMs,
  searchQuery,
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof GroupTableItem>(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIRECTION);
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );

  const { euiTheme } = useEuiTheme();
  const visColors = euiPaletteColorBlind();
  const primaryBackgroundColor = useEuiBackgroundColor('primary');

  const { pinnedGroup, selectedGroup, setPinnedGroup, setSelectedGroup } =
    useSpikeAnalysisTableRowContext();
  const dataViewId = dataView.id;

  const toggleDetails = (item: GroupTableItem) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMapValues[item.id]) {
      delete itemIdToExpandedRowMapValues[item.id];
    } else {
      itemIdToExpandedRowMapValues[item.id] = (
        <SpikeAnalysisTable
          significantTerms={item.groupItemsSortedByUniqueness.reduce<SignificantTerm[]>(
            (p, groupItem) => {
              const st = significantTerms.find(
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
          <span>Expand rows</span>
        </EuiScreenReaderOnly>
      ),
      render: (item: GroupTableItem) => (
        <EuiButtonIcon
          data-test-subj={'aiopsSpikeAnalysisGroupsTableRowExpansionButton'}
          onClick={() => toggleDetails(item)}
          aria-label={
            itemIdToExpandedRowMap[item.id]
              ? i18n.translate(
                  'xpack.aiops.explainLogRateSpikes.spikeAnalysisTable.collapseAriaLabel',
                  {
                    defaultMessage: 'Collapse',
                  }
                )
              : i18n.translate(
                  'xpack.aiops.explainLogRateSpikes.spikeAnalysisTable.expandAriaLabel',
                  {
                    defaultMessage: 'Expand',
                  }
                )
          }
          iconType={itemIdToExpandedRowMap[item.id] ? 'arrowDown' : 'arrowRight'}
        />
      ),
      valign: 'top',
    },
    {
      'data-test-subj': 'aiopsSpikeAnalysisGroupsTableColumnGroup',
      field: 'group',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.groupColumnTooltip',
            {
              defaultMessage:
                'Displays up to {maxItemCount} group items sorted by uniqueness and document count. Expand row to see all field/value pairs.',
              values: { maxItemCount: MAX_GROUP_BADGES },
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.groupLabel"
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
            <>
              <EuiBadge
                key={`${fieldName}-id`}
                data-test-subj="aiopsSpikeAnalysisTableColumnGroupBadge"
                color="hollow"
              >
                <span>
                  {(duplicate ?? 0) <= 1 ? '* ' : ''}
                  {`${fieldName}: `}
                </span>
                <span style={{ color: visColors[2] }}>{`${fieldValue}`}</span>
              </EuiBadge>
              <EuiSpacer size="xs" />
            </>
          );
        }

        if (groupItemsSortedByUniqueness.length > MAX_GROUP_BADGES) {
          valuesBadges.push(
            <EuiText
              key={`group-info-id`}
              data-test-subj="aiopsSpikeAnalysisGroupsTableColumnGroupInfo"
              color="subdued"
              size="xs"
            >
              <FormattedMessage
                id="xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.groupItemsInfo"
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
                    id="xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.groupUniqueItemsInfo"
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
      'data-test-subj': 'aiopsSpikeAnalysisGroupsTableColumnLogRate',
      width: NARROW_COLUMN_WIDTH,
      field: 'pValue',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.logRateColumnTooltip',
            {
              defaultMessage:
                'A visual representation of the impact of the group on the message rate difference.',
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.logRateLabel"
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
          label={i18n.translate(
            'xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.groupLabel',
            {
              defaultMessage: 'Group',
            }
          )}
        />
      ),
      sortable: false,
      valign: 'top',
    },
    {
      'data-test-subj': 'aiopsSpikeAnalysisGroupsTableColumnDocCount',
      width: NARROW_COLUMN_WIDTH,
      field: 'docCount',
      name: i18n.translate('xpack.aiops.correlations.spikeAnalysisTableGroups.docCountLabel', {
        defaultMessage: 'Doc count',
      }),
      sortable: true,
      valign: 'top',
    },
    {
      'data-test-subj': 'aiopsSpikeAnalysisGroupsTableColumnPValue',
      width: NARROW_COLUMN_WIDTH,
      field: 'pValue',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.pValueColumnTooltip',
            {
              defaultMessage:
                'The significance of changes in the frequency of values; lower values indicate greater change.',
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.pValueLabel"
              defaultMessage="p-value"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      render: (pValue: number | null) => pValue?.toPrecision(3) ?? NOT_AVAILABLE,
      sortable: true,
      valign: 'top',
    },
    {
      'data-test-subj': 'aiopsSpikeAnalysisTableColumnImpact',
      width: NARROW_COLUMN_WIDTH,
      field: 'pValue',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.impactLabelColumnTooltip',
            {
              defaultMessage: 'The level of impact of the group on the message rate difference',
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.explainLogRateSpikes.spikeAnalysisTable.impactLabel"
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
    },
    {
      'data-test-subj': 'aiOpsSpikeAnalysisTableColumnAction',
      name: i18n.translate('xpack.aiops.spikeAnalysisTable.actionsColumnName', {
        defaultMessage: 'Actions',
      }),
      actions: [viewInDiscoverAction, viewInLogPatternAnalysisAction, copyToClipBoardAction],
      width: ACTIONS_COLUMN_WIDTH,
      valign: 'top',
    },
  ];

  const onChange = useCallback((tableSettings) => {
    const { index, size } = tableSettings.page;
    const { field, direction } = tableSettings.sort;

    setPageIndex(index);
    setPageSize(size);
    setSortField(field);
    setSortDirection(direction);
  }, []);

  const { pagination, pageOfItems, sorting } = useMemo(() => {
    const pageStart = pageIndex * pageSize;
    const itemCount = groupTableItems?.length ?? 0;

    let items = groupTableItems ?? [];
    items = sortBy(groupTableItems, (item) => {
      if (item && typeof item[sortField] === 'string') {
        // @ts-ignore Object is possibly null or undefined
        return item[sortField].toLowerCase();
      }
      return item[sortField];
    });
    items = sortDirection === 'asc' ? items : items.reverse();

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
      data-test-subj="aiopsSpikeAnalysisGroupsTable"
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
          'data-test-subj': `aiopsSpikeAnalysisGroupsTableRow row-${group.id}`,
          onClick: () => {
            if (group.id === pinnedGroup?.id) {
              setPinnedGroup(null);
            } else {
              setPinnedGroup(group);
            }
          },
          onMouseEnter: () => {
            setSelectedGroup(group);
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
