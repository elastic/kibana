/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

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
  PivotAggsConfig,
  PivotGroupByConfigDict,
  SimpleQuery,
} from '../../common';

import { PIVOT_PREVIEW_STATUS, usePivotPreviewData } from './use_pivot_preview_data';

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
  aggs: PivotAggsConfig[];
  groupBy: PivotGroupByConfigDict;
  query: SimpleQuery;
}

export const PivotPreview: React.SFC<Props> = React.memo(({ aggs, groupBy, query }) => {
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

  const groupByArr = dictionaryToArray(groupBy);
  const columnKeys = Object.keys(dataFramePreviewData[0]);
  columnKeys.sort((a, b) => {
    // make sure groupBy fields are always most left columns
    if (groupByArr.some(d => d.formRowLabel === a) && groupByArr.some(d => d.formRowLabel === b)) {
      return a.localeCompare(b);
    }
    if (groupByArr.some(d => d.formRowLabel === a)) {
      return -1;
    }
    if (groupByArr.some(d => d.formRowLabel === b)) {
      return 1;
    }
    return a.localeCompare(b);
  });

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
      {dataFramePreviewData.length > 0 && (
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
