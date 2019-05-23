/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { StaticIndexPattern } from 'ui/index_patterns';

import { dictionaryToArray } from '../../../../common/types/common';
import { ml } from '../../../services/ml_api_service';

import { Dictionary } from '../../../../common/types/common';
import {
  DataFramePreviewRequest,
  getDataFramePreviewRequest,
  groupByConfigHasInterval,
  PivotAggsConfigDict,
  PivotGroupByConfigDict,
  SimpleQuery,
} from '../../common';

export enum PIVOT_PREVIEW_STATUS {
  UNUSED,
  LOADING,
  LOADED,
  ERROR,
}

export interface UsePivotPreviewDataReturnType {
  errorMessage: string;
  status: PIVOT_PREVIEW_STATUS;
  dataFramePreviewData: Array<Dictionary<any>>;
  previewRequest: DataFramePreviewRequest;
}

export const usePivotPreviewData = (
  indexPattern: StaticIndexPattern,
  query: SimpleQuery,
  aggs: PivotAggsConfigDict,
  groupBy: PivotGroupByConfigDict
): UsePivotPreviewDataReturnType => {
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState(PIVOT_PREVIEW_STATUS.UNUSED);
  const [dataFramePreviewData, setDataFramePreviewData] = useState([]);

  const aggsArr = dictionaryToArray(aggs);
  const groupByArr = dictionaryToArray(groupBy);

  const previewRequest = getDataFramePreviewRequest(indexPattern.title, query, groupByArr, aggsArr);

  const getDataFramePreviewData = async () => {
    if (aggsArr.length === 0 || groupByArr.length === 0) {
      setDataFramePreviewData([]);
      return;
    }

    setErrorMessage('');
    setStatus(PIVOT_PREVIEW_STATUS.LOADING);

    try {
      const resp: any = await ml.dataFrame.getDataFrameTransformsPreview(previewRequest);
      setDataFramePreviewData(resp.preview);
      setStatus(PIVOT_PREVIEW_STATUS.LOADED);
    } catch (e) {
      setErrorMessage(JSON.stringify(e));
      setDataFramePreviewData([]);
      setStatus(PIVOT_PREVIEW_STATUS.ERROR);
    }
  };

  useEffect(
    () => {
      getDataFramePreviewData();
    },
    [
      indexPattern.title,
      aggsArr.map(a => `${a.agg} ${a.field} ${a.aggName}`).join(' '),
      groupByArr
        .map(
          g => `${g.agg} ${g.field} ${g.aggName} ${groupByConfigHasInterval(g) ? g.interval : ''}`
        )
        .join(' '),
      query.query_string.query,
    ]
  );
  return { errorMessage, status, dataFramePreviewData, previewRequest };
};
