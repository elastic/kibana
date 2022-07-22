/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo, useState } from 'react';
import { EuiBadge, EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ChangePoint } from '@kbn/ml-agg-utils';

import { MiniHistogram } from '../mini_histogram';

import { getFailedTransactionsCorrelationImpactLabel } from './get_failed_transactions_correlation_impact_label';

const PAGINATION_SIZE_OPTIONS = [5, 10, 20, 50];
const noDataText = i18n.translate('xpack.aiops.correlations.correlationsTable.noDataText', {
  defaultMessage: 'No data',
});

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
        <>
          {i18n.translate(
            'xpack.aiops.correlations.failedTransactions.correlationsTable.logRateLabel',
            {
              defaultMessage: 'Log rate',
            }
          )}
        </>
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
      name: 'p-value',
      render: (pValue: number) => pValue.toPrecision(3),
      sortable: true,
    },
    {
      field: 'pValue',
      name: (
        <>
          {i18n.translate(
            'xpack.aiops.correlations.failedTransactions.correlationsTable.impactLabel',
            {
              defaultMessage: 'Impact',
            }
          )}
        </>
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

    setPageIndex(index);
    setPageSize(size);
  }, []);

  const { pagination, pageOfItems } = useMemo(() => {
    const pageStart = pageIndex * pageSize;

    const itemCount = changePoints?.length ?? 0;
    return {
      pageOfItems: changePoints
        // Temporary default sorting by ascending pValue until we add native table sorting
        ?.sort((a, b) => {
          return (a?.pValue ?? 1) - (b?.pValue ?? 0);
        })
        .slice(pageStart, pageStart + pageSize),
      pagination: {
        pageIndex,
        pageSize,
        totalItemCount: itemCount,
        pageSizeOptions: PAGINATION_SIZE_OPTIONS,
      },
    };
  }, [pageIndex, pageSize, changePoints]);

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
      // sorting={sorting}
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
