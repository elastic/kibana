/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo, useState } from 'react';
import { EuiBadge, EuiBasicTable, EuiBasicTableColumn, RIGHT_ALIGNMENT } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ChangePoint } from '../../../common/types';
import { ImpactBar } from './impact_bar';
import { getFailedTransactionsCorrelationImpactLabel } from './get_failed_transactions_correlation_impact_label';

const PAGINATION_SIZE_OPTIONS = [5, 10, 20, 50];
const noDataText = i18n.translate('xpack.aiops.correlations.correlationsTable.noDataText', {
  defaultMessage: 'No data',
});

interface Props {
  changePointData: ChangePoint[];
  error?: string;
  loading: boolean;
}

export const SpikeAnalysisTable: FC<Props> = ({ changePointData, error, loading }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const columns: Array<EuiBasicTableColumn<ChangePoint>> = [
    {
      field: 'score',
      name: (
        <>
          {i18n.translate(
            'xpack.aiops.correlations.failedTransactions.correlationsTable.pValueLabel',
            {
              defaultMessage: 'Score',
            }
          )}
        </>
      ),
      align: RIGHT_ALIGNMENT,
      render: (_, { score }) => {
        return (
          <>
            <ImpactBar size="m" value={Number(score.toFixed(2))} label={score.toFixed(2)} />
          </>
        );
      },
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
      name: 'p-value',
      render: (pValue: number) => pValue.toPrecision(3),
      sortable: true,
    },
  ];

  const onChange = useCallback((tableSettings) => {
    const { index, size } = tableSettings.page;

    setPageIndex(index);
    setPageSize(size);

    // onTableChange(tableSettings);
  }, []);

  const { pagination, pageOfItems } = useMemo(() => {
    const pageStart = pageIndex * pageSize;

    const itemCount = changePointData?.length ?? 0;
    return {
      pageOfItems: changePointData?.slice(pageStart, pageStart + pageSize),
      pagination: {
        pageIndex,
        pageSize,
        totalItemCount: itemCount,
        pageSizeOptions: PAGINATION_SIZE_OPTIONS,
      },
    };
  }, [pageIndex, pageSize, changePointData]);

  return (
    <EuiBasicTable
      columns={columns}
      items={pageOfItems ?? []}
      noItemsMessage={noDataText}
      onChange={onChange}
      pagination={pagination}
      loading={loading}
      error={error}
      // sorting={sorting}
      //   rowProps={(term) => {
      //     return {
      //       onClick: () => {
      //         // if (setPinnedSignificantTerm) {
      //         //   setPinnedSignificantTerm(term);
      //         // }
      //       },
      //       onMouseEnter: () => {
      //         // setSelectedSignificantTerm(term);
      //       },
      //       onMouseLeave: () => {
      //         // setSelectedSignificantTerm(null);
      //       },
      //       // style:
      //       //   selectedTerm &&
      //       //   selectedTerm.fieldValue === term.fieldValue &&
      //       //   selectedTerm.fieldName === term.fieldName
      //       //     ? {
      //       //         backgroundColor: euiTheme.eui.euiColorLightestShade,
      //       //       }
      //       //     : null,
      //     };
      //   }}
    />
  );
};
