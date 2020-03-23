/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { dictionaryToArray } from '../../../../common/types/common';
import { useApi } from '../../hooks/use_api';

import { IndexPattern } from '../../../../../../../src/plugins/data/public';

import {
  getPreviewRequestBody,
  PreviewRequestBody,
  PivotAggsConfigDict,
  PivotGroupByConfigDict,
  PivotQuery,
  PreviewData,
  PreviewMappings,
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
  previewData: PreviewData;
  previewMappings: PreviewMappings;
  previewRequest: PreviewRequestBody;
}

export const usePivotPreviewData = (
  indexPatternTitle: IndexPattern['title'],
  query: PivotQuery,
  aggs: PivotAggsConfigDict,
  groupBy: PivotGroupByConfigDict
): UsePivotPreviewDataReturnType => {
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState(PIVOT_PREVIEW_STATUS.UNUSED);
  const [previewData, setPreviewData] = useState<PreviewData>([]);
  const [previewMappings, setPreviewMappings] = useState<PreviewMappings>({ properties: {} });
  const api = useApi();

  const aggsArr = dictionaryToArray(aggs);
  const groupByArr = dictionaryToArray(groupBy);

  const previewRequest = getPreviewRequestBody(indexPatternTitle, query, groupByArr, aggsArr);

  const getPreviewData = async () => {
    if (aggsArr.length === 0 || groupByArr.length === 0) {
      setPreviewData([]);
      return;
    }

    setErrorMessage('');
    setStatus(PIVOT_PREVIEW_STATUS.LOADING);

    try {
      const resp = await api.getTransformsPreview(previewRequest);
      setPreviewData(resp.preview);
      setPreviewMappings(resp.generated_dest_index.mappings);
      setStatus(PIVOT_PREVIEW_STATUS.LOADED);
    } catch (e) {
      setErrorMessage(JSON.stringify(e, null, 2));
      setPreviewData([]);
      setPreviewMappings({ properties: {} });
      setStatus(PIVOT_PREVIEW_STATUS.ERROR);
    }
  };

  useEffect(() => {
    getPreviewData();
    // custom comparison
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [
    indexPatternTitle,
    JSON.stringify(aggsArr),
    JSON.stringify(groupByArr),
    JSON.stringify(query),
    /* eslint-enable react-hooks/exhaustive-deps */
  ]);

  return { errorMessage, status, previewData, previewMappings, previewRequest };
};
