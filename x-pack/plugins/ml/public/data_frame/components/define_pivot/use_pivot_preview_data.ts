/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { ml } from '../../../services/ml_api_service';

import { Dictionary } from '../../../../common/types/common';
import { getDataFramePreviewRequest, OptionsDataElement, SimpleQuery } from '../../common';
import { IndexPatternContextValue } from '../../common/index_pattern_context';

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
}

export const usePivotPreviewData = (
  indexPattern: IndexPatternContextValue,
  query: SimpleQuery,
  aggs: OptionsDataElement[],
  groupBy: string[]
): UsePivotPreviewDataReturnType => {
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState(PIVOT_PREVIEW_STATUS.UNUSED);
  const [dataFramePreviewData, setDataFramePreviewData] = useState([]);

  if (indexPattern !== null) {
    const getDataFramePreviewData = async () => {
      if (aggs.length === 0 || groupBy.length === 0) {
        setDataFramePreviewData([]);
        return;
      }

      setErrorMessage('');
      setStatus(PIVOT_PREVIEW_STATUS.LOADING);

      const request = getDataFramePreviewRequest(indexPattern.title, query, groupBy, aggs);

      try {
        const resp: any = await ml.dataFrame.getDataFrameTransformsPreview(request);
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
      [indexPattern.title, aggs, groupBy, query]
    );
  }
  return { errorMessage, status, dataFramePreviewData };
};
