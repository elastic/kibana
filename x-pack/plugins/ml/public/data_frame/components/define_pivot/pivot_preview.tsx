/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useContext, useEffect, useState } from 'react';

import { EuiInMemoryTable, EuiProgress } from '@elastic/eui';

import { ml } from '../../../services/ml_api_service';

import {
  getDataFramePreviewRequest,
  IndexPatternContext,
  OptionsDataElement,
  SimpleQuery,
} from '../../common';

interface Props {
  aggs: OptionsDataElement[];
  groupBy: string[];
  query: SimpleQuery['query'];
}

export const PivotPreview: React.SFC<Props> = ({ aggs, groupBy, query }) => {
  const indexPattern = useContext(IndexPatternContext);

  if (indexPattern === null) {
    return null;
  }

  const [loading, setLoading] = useState(false);
  const [dataFramePreviewData, setDataFramePreviewData] = useState([]);

  useEffect(
    () => {
      if (aggs.length === 0) {
        setDataFramePreviewData([]);
        return;
      }

      setLoading(true);

      const request = getDataFramePreviewRequest(indexPattern.title, query, groupBy, aggs);

      ml.dataFrame
        .getDataFrameTransformsPreview(request)
        .then((resp: any) => {
          setDataFramePreviewData(resp.preview);
          setLoading(false);
        })
        .catch((resp: any) => {
          setDataFramePreviewData([]);
          setLoading(false);
        });
    },
    [indexPattern.title, JSON.stringify(aggs)]
  );

  if (dataFramePreviewData.length === 0) {
    return null;
  }

  const columnKeys = Object.keys(dataFramePreviewData[0]);
  columnKeys.sort((a, b) => {
    // make sure groupBy fields are always most left columns
    if (groupBy.some(d => d === a) && groupBy.some(d => d === b)) {
      return a.localeCompare(b);
    }
    if (groupBy.some(d => d === a)) {
      return -1;
    }
    if (groupBy.some(d => d === b)) {
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

  return (
    <Fragment>
      <h3>Data Frame Pivot Preview</h3>
      {loading && <EuiProgress size="xs" color="accent" />}
      {!loading && <EuiProgress size="xs" color="accent" max={1} value={0} />}
      {dataFramePreviewData.length > 0 && (
        <EuiInMemoryTable items={dataFramePreviewData} columns={columns} pagination={true} />
      )}
    </Fragment>
  );
};
