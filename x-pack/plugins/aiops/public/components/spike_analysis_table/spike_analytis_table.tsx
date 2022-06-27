/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// @ts-nocheck // TODO: remove
import React, { FC, memo, useCallback, useMemo, useState } from 'react'; // useEffect, FC
import { isEqual } from 'lodash';

// import { Chart, BarSeries, ScaleType, Settings } from '@elastic/charts';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  //   EuiFlexGroup,
  //   EuiFlexItem,
  //   EuiSplitPanel,
  //   EuiStat,
  //   EuiTabbedContent,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ChangePoint } from '../../../common/types';

const PAGINATION_SIZE_OPTIONS = [5, 10, 20, 50];
const loadingText = i18n.translate('xpack.aiops.correlations.correlationsTable.loadingText', {
  defaultMessage: 'Loading...',
});

const noDataText = i18n.translate('xpack.aiops.correlations.correlationsTable.noDataText', {
  defaultMessage: 'No data',
});

interface Props {
  changePointData: ChangePoint[];
}

export const SpikeAnalysisTable: FC<Props> = memo(
  ({ changePointData }) => {
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    //   const { progress, response, startFetch, cancelFetch } = useChangePointDetection(
    //     dataView,
    //     spikeSelection
    //   );
    // can take this out of the useMemo once it's real data
    //   const significantTerms = useMemo(
    //     () => orderBy(response.changePoints, 'normalizedScore', 'desc'),
    //     [response.changePoints]
    //   );

    const columns: Array<EuiBasicTableColumn<any>> = [
      {
        //   width: '116px',
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
        //   render: (_, { normalizedScore }) => {
        //     return (
        //       <>
        //         <ImpactBar size="m" value={normalizedScore * 100} />
        //       </>
        //     );
        //   },
        sortable: true,
      },
      {
        //   width: '116px',
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
          return null;
          // const label = getFailedTransactionsCorrelationImpactLabel(pValue);
          // return label ? <EuiBadge color={label.color}>{label.impact}</EuiBadge> : null;
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
        //   width: '100px',
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
        // loading={status === FETCH_STATUS.LOADING}
        // error={status === FETCH_STATUS.FAILURE ? errorMessage : ''}
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
  },
  (prevProps, nextProps) => {
    return isEqual(prevProps, nextProps);
  }
);
