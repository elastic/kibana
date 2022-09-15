/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo, useState } from 'react';
import { sortBy } from 'lodash';

import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiTableSortingType,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { ChangePoint } from '@kbn/ml-agg-utils';
import { useEuiTheme } from '../../hooks/use_eui_theme';
import { SpikeAnalysisTableExpandedRow } from './spike_analysis_table_expanded_row';

const PAGINATION_SIZE_OPTIONS = [5, 10, 20, 50];
const DEFAULT_SORT_FIELD = 'docCount';
const DEFAULT_SORT_DIRECTION = 'desc';
interface GroupTableItem {
  id: number;
  docCount: number;
  group: Record<string, any>;
  repeatedValues: Record<string, any>;
}

interface SpikeAnalysisTableProps {
  changePoints: ChangePoint[];
  groupTableItems: GroupTableItem[];
  dataViewId?: string;
  loading: boolean;
  onPinnedChangePoint?: (changePoint: ChangePoint | null) => void;
  onSelectedChangePoint?: (changePoint: ChangePoint | null) => void;
  selectedChangePoint?: ChangePoint;
}

export const SpikeAnalysisGroupsTable: FC<SpikeAnalysisTableProps> = ({
  changePoints,
  groupTableItems,
  dataViewId,
  loading,
  onPinnedChangePoint,
  onSelectedChangePoint,
  selectedChangePoint,
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof GroupTableItem>(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIRECTION);
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );

  const euiTheme = useEuiTheme();

  const toggleDetails = (item: GroupTableItem) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMapValues[item.id]) {
      delete itemIdToExpandedRowMapValues[item.id];
    } else {
      const { group, repeatedValues } = item;

      const expandedTableItems = [];
      const fullGroup = { ...group, ...repeatedValues };

      for (const fieldName in fullGroup) {
        if (fullGroup.hasOwnProperty(fieldName)) {
          const fieldValue = fullGroup[fieldName];
          expandedTableItems.push({
            fieldName: `${fieldName}`,
            fieldValue: `${fullGroup[fieldName]}`,
            ...(changePoints.find(
              (changePoint) =>
                (changePoint.fieldName === fieldName ||
                  changePoint.fieldName === `${fieldName}.keyword`) &&
                (changePoint.fieldValue === fieldValue ||
                  changePoint.fieldValue === `${fieldValue}.keyword`)
            ) ?? {}),
          });
        }
      }

      itemIdToExpandedRowMapValues[item.id] = (
        <SpikeAnalysisTableExpandedRow
          changePoints={expandedTableItems as ChangePoint[]}
          loading={loading}
          onPinnedChangePoint={onPinnedChangePoint}
          onSelectedChangePoint={onSelectedChangePoint}
          selectedChangePoint={selectedChangePoint}
          dataViewId={dataViewId}
        />
      );
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const columns: Array<EuiBasicTableColumn<GroupTableItem>> = [
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
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
          aria-label={itemIdToExpandedRowMap[item.id] ? 'Collapse' : 'Expand'}
          iconType={itemIdToExpandedRowMap[item.id] ? 'arrowUp' : 'arrowDown'}
        />
      ),
    },
    {
      'data-test-subj': 'aiopsSpikeAnalysisGroupsTableColumnGroup',
      field: 'group',
      name: i18n.translate(
        'xpack.aiops.correlations.failedTransactions.correlationsTable.groupLabel',
        { defaultMessage: 'Group' }
      ),
      render: (_, { group, repeatedValues }) => {
        const valuesBadges = [];
        for (const fieldName in group) {
          if (group.hasOwnProperty(fieldName)) {
            valuesBadges.push(
              <>
                <EuiBadge
                  key={`${fieldName}-id`}
                  data-test-subj="aiopsSpikeAnalysisTableColumnGroupBadge"
                  color="hollow"
                >
                  <span>{`${fieldName}: `}</span>
                  <span
                    style={{ color: euiTheme.euiCodeBlockStringColor }}
                  >{`${group[fieldName]}`}</span>
                </EuiBadge>
                <EuiSpacer size="xs" />
              </>
            );
          }
        }
        if (Object.keys(repeatedValues).length > 0) {
          valuesBadges.push(
            <>
              <EuiBadge
                key={`$more-id`}
                data-test-subj="aiopsSpikeAnalysisGroupsTableColumnGroupBadge"
                color="hollow"
              >
                +{Object.keys(repeatedValues).length} more
              </EuiBadge>
              <EuiSpacer size="xs" />
            </>
          );
        }
        return valuesBadges;
      },
      sortable: false,
      textOnly: true,
    },
    {
      'data-test-subj': 'aiopsSpikeAnalysisGroupsTableColumnDocCount',
      field: 'docCount',
      name: i18n.translate('xpack.aiops.correlations.correlationsTable.docCountLabel', {
        defaultMessage: 'Doc count',
      }),
      sortable: true,
      width: '20%',
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

  return (
    <EuiBasicTable
      data-test-subj="aiopsSpikeAnalysisGroupsTable"
      compressed
      columns={columns}
      items={pageOfItems}
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      onChange={onChange}
      pagination={pagination}
      loading={false}
      sorting={sorting as EuiTableSortingType<GroupTableItem>}
      rowProps={(group) => {
        return {
          'data-test-subj': `aiopsSpikeAnalysisGroupsTableRow row-${group.id}`,
        };
      }}
    />
  );
};
