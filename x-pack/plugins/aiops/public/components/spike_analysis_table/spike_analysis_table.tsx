/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiIcon,
  EuiTableSortingType,
  EuiToolTip,
} from '@elastic/eui';
import { sortBy } from 'lodash';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ChangePoint } from '@kbn/ml-agg-utils';

import { MiniHistogram } from '../mini_histogram';

import { getFailedTransactionsCorrelationImpactLabel } from './get_failed_transactions_correlation_impact_label';

const PAGINATION_SIZE_OPTIONS = [5, 10, 20, 50];
const noDataText = i18n.translate('xpack.aiops.correlations.correlationsTable.noDataText', {
  defaultMessage: 'No data',
});
const DEFAULT_SORT_FIELD = 'pValue';
const DEFAULT_SORT_DIRECTION = 'asc';

interface SpikeAnalysisTableProps {
  changePoints: ChangePoint[];
  error?: string;
  loading: boolean;
  onPinnedChangePoint?: (changePoint: ChangePoint | null) => void;
  onSelectedChangePoint?: (changePoint: ChangePoint | null) => void;
  selectedChangePoint?: ChangePoint;
}

export const SpikeAnalysisTable: FC<SpikeAnalysisTableProps> = ({
  changePoints,
  error,
  loading,
  onPinnedChangePoint,
  onSelectedChangePoint,
  selectedChangePoint,
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof ChangePoint>(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIRECTION);

  const columns: Array<EuiBasicTableColumn<ChangePoint>> = [
    {
      field: 'fieldName',
      name: i18n.translate(
        'xpack.aiops.correlations.failedTransactions.correlationsTable.fieldNameLabel',
        { defaultMessage: 'Field name' }
      ),
      sortable: true,
    },
    {
      field: 'fieldValue',
      name: i18n.translate(
        'xpack.aiops.correlations.failedTransactions.correlationsTable.fieldValueLabel',
        { defaultMessage: 'Field value' }
      ),
      render: (_, { fieldValue }) => String(fieldValue).slice(0, 50),
      sortable: true,
    },
    {
      field: 'pValue',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.correlations.failedTransactions.correlationsTable.logRateColumnTooltip',
            {
              defaultMessage:
                'A visual representation of the impact of the field on the message rate difference',
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.correlations.failedTransactions.correlationsTable.logRateLabel"
              defaultMessage="Log rate"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      render: (_, { histogram, fieldName, fieldValue }) => {
        return histogram ? (
          <MiniHistogram chartData={histogram} label={`${fieldName}:${fieldValue}`} />
        ) : null;
      },
      sortable: false,
    },
    {
      field: 'pValue',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.correlations.failedTransactions.correlationsTable.pValueColumnTooltip',
            {
              defaultMessage:
                'The significance of changes in the frequency of values; lower values indicate greater change',
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.correlations.failedTransactions.correlationsTable.pValueLabel"
              defaultMessage="p-value"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      render: (pValue: number) => pValue.toPrecision(3),
      sortable: true,
    },
    {
      field: 'pValue',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.correlations.failedTransactions.correlationsTable.impactLabelColumnTooltip',
            {
              defaultMessage: 'The level of impact of the field on the message rate difference',
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.correlations.failedTransactions.correlationsTable.impactLabel"
              defaultMessage="Impact"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      render: (_, { pValue }) => {
        const label = getFailedTransactionsCorrelationImpactLabel(pValue);
        return label ? <EuiBadge color={label.color}>{label.impact}</EuiBadge> : null;
      },
      sortable: true,
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
    const itemCount = changePoints?.length ?? 0;

    let items: ChangePoint[] = changePoints ?? [];
    items = sortBy(changePoints, (item) => {
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
  }, [pageIndex, pageSize, sortField, sortDirection, changePoints]);

  return (
    <EuiBasicTable
      compressed
      columns={columns}
      items={pageOfItems}
      noItemsMessage={noDataText}
      onChange={onChange}
      pagination={pagination}
      loading={loading}
      error={error}
      sorting={sorting as EuiTableSortingType<ChangePoint>}
      rowProps={(changePoint) => {
        return {
          onClick: () => {
            if (onPinnedChangePoint) {
              onPinnedChangePoint(changePoint);
            }
          },
          onMouseEnter: () => {
            if (onSelectedChangePoint) {
              onSelectedChangePoint(changePoint);
            }
          },
          onMouseLeave: () => {
            if (onSelectedChangePoint) {
              onSelectedChangePoint(null);
            }
          },
          style:
            selectedChangePoint &&
            selectedChangePoint.fieldValue === changePoint.fieldValue &&
            selectedChangePoint.fieldName === changePoint.fieldName
              ? {
                  // TODO use euiTheme
                  // backgroundColor: euiTheme.eui.euiColorLightestShade,
                  backgroundColor: '#ddd',
                }
              : null,
        };
      }}
    />
  );
};
