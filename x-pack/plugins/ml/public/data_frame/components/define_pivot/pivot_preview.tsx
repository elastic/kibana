/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useRef, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiCallOut,
  EuiInMemoryTable,
  EuiPanel,
  EuiProgress,
  EuiTitle,
  SortDirection,
} from '@elastic/eui';

import { dictionaryToArray } from '../../../../common/types/common';

import {
  IndexPatternContext,
  PivotAggsConfigDict,
  PivotGroupByConfig,
  PivotGroupByConfigDict,
  SimpleQuery,
} from '../../common';

import { PIVOT_PREVIEW_STATUS, usePivotPreviewData } from './use_pivot_preview_data';

function sortColumns(groupByArr: PivotGroupByConfig[]) {
  return (a: string, b: string) => {
    // make sure groupBy fields are always most left columns
    if (groupByArr.some(d => d.aggName === a) && groupByArr.some(d => d.aggName === b)) {
      return a.localeCompare(b);
    }
    if (groupByArr.some(d => d.aggName === a)) {
      return -1;
    }
    if (groupByArr.some(d => d.aggName === b)) {
      return 1;
    }
    return a.localeCompare(b);
  };
}

function usePrevious(value: any) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const PreviewTitle = () => (
  <EuiTitle size="xs">
    <span>
      {i18n.translate('xpack.ml.dataframe.pivotPreview.dataFramePivotPreviewTitle', {
        defaultMessage: 'Data frame pivot preview',
      })}
    </span>
  </EuiTitle>
);

interface Props {
  aggs: PivotAggsConfigDict;
  groupBy: PivotGroupByConfigDict;
  query: SimpleQuery;
}

export const PivotPreview: React.SFC<Props> = React.memo(({ aggs, groupBy, query }) => {
  const [clearTable, setClearTable] = useState(false);

  const indexPattern = useContext(IndexPatternContext);

  if (indexPattern === null) {
    return null;
  }

  const { dataFramePreviewData, errorMessage, status } = usePivotPreviewData(
    indexPattern,
    query,
    aggs,
    groupBy
  );

  const groupByArr = dictionaryToArray(groupBy);

  // EuiInMemoryTable has an issue with dynamic sortable columns
  // and will trigger a full page Kibana error in such a case.
  // The following is a workaround until this is solved upstream:
  // - If the sortable/columns config changes,
  //   the table will be unmounted/not rendered.
  //   This is what the useEffect() part does.
  // - After that the table gets re-enabled. To make sure React
  //   doesn't consolidate the state updates, setTimeout is used.
  const firstColumnName =
    dataFramePreviewData.length > 0
      ? Object.keys(dataFramePreviewData[0]).sort(sortColumns(groupByArr))[0]
      : undefined;

  const firstColumnNameChanged = usePrevious(firstColumnName) !== firstColumnName;
  useEffect(() => {
    if (firstColumnNameChanged) {
      setClearTable(true);
    }
    if (clearTable) {
      setTimeout(() => setClearTable(false), 0);
    }
  });

  if (firstColumnNameChanged) {
    return null;
  }

  if (status === PIVOT_PREVIEW_STATUS.ERROR) {
    return (
      <EuiPanel grow={false}>
        <PreviewTitle />
        <EuiCallOut
          title={i18n.translate(
            'xpack.ml.dataframe.sourceIndexPreview.dataFramePivotPreviewError',
            {
              defaultMessage: 'An error occurred loading the pivot preview.',
            }
          )}
          color="danger"
          iconType="cross"
        >
          <p>{errorMessage}</p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  if (dataFramePreviewData.length === 0) {
    return (
      <EuiPanel grow={false}>
        <PreviewTitle />
        <EuiCallOut
          title={i18n.translate(
            'xpack.ml.dataframe.sourceIndexPreview.dataFramePivotPreviewNoDataCalloutTitle',
            {
              defaultMessage: 'Pivot preview not available',
            }
          )}
          color="primary"
        >
          <p>
            {i18n.translate(
              'xpack.ml.dataframe.sourceIndexPreview.dataFramePivotPreviewNoDataCalloutBody',
              {
                defaultMessage: 'Please choose at least one group-by field and aggregation.',
              }
            )}
          </p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  const columnKeys = Object.keys(dataFramePreviewData[0]);
  columnKeys.sort(sortColumns(groupByArr));

  const columns = columnKeys.map(k => {
    return {
      field: k,
      name: k,
      sortable: true,
      truncateText: true,
    };
  });

  const sorting = {
    sort: {
      field: columns[0].field,
      direction: SortDirection.ASC,
    },
  };

  return (
    <EuiPanel>
      <PreviewTitle />
      {status === PIVOT_PREVIEW_STATUS.LOADING && <EuiProgress size="xs" color="accent" />}
      {status !== PIVOT_PREVIEW_STATUS.LOADING && (
        <EuiProgress size="xs" color="accent" max={1} value={0} />
      )}
      {dataFramePreviewData.length > 0 && clearTable === false && (
        <EuiInMemoryTable
          items={dataFramePreviewData}
          columns={columns}
          pagination={true}
          sorting={sorting}
        />
      )}
    </EuiPanel>
  );
});
