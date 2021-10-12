/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect } from 'react';
import { useMatrixHistogram } from '../../../../common/containers/matrix_histogram';
import * as i18n from './translations';
import { MatrixHistogramType } from '../../../../../common';

// TODO: use CTI constant
const DEFAULT_PREVIEW_INDEX = '.siem-preview-signals';

interface PreviewHistogramParams {
  previewId: string | undefined;
  endDate: string;
  startDate: string;
}

export const usePreviewHistogram = ({ previewId, startDate, endDate }: PreviewHistogramParams) => {
  const [isHistogramLoading, { inspect, totalCount, refetch, data }, start] = useMatrixHistogram({
    errorMessage: i18n.QUERY_PREVIEW_ERROR,
    endDate,
    startDate,
    filterQuery: { query: '*:*', language: 'kuery' },
    indexNames: [`${DEFAULT_PREVIEW_INDEX}-*`],
    includeMissingData: false,
    histogramType: MatrixHistogramType.events,
    stackByField: 'event.category',
    skip: true,
  });

  useEffect(() => {
    if (previewId) {
      start(startDate, endDate);
    }
  }, [previewId, start]);

  return { isHistogramLoading, inspect, refetch, totalCount, data };
};
