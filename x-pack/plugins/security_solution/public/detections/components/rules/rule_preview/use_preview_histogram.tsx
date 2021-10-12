/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMatrixHistogram } from '../../../../common/containers/matrix_histogram';
import * as i18n from './translations';
import { MatrixHistogramType } from '../../../../../common';

// TODO: use CTI constant
const DEFAULT_PREVIEW_INDEX = '.siem-preview-signals';

interface PreviewHistogramParams {
  previewId: string;
  endDate: string;
  startDate: string;
}

export const usePreviewHistogram = ({ previewId, startDate, endDate }: PreviewHistogramParams) => {
  const [isHistogramLoading, { inspect, totalCount, refetch, data }, start] = useMatrixHistogram({
    errorMessage: i18n.QUERY_PREVIEW_ERROR,
    endDate,
    startDate,
    filterQuery: { query: `event.type:indicator`, language: 'kuery' },
    indexNames: [`${DEFAULT_PREVIEW_INDEX}-*`],
    includeMissingData: false,
    histogramType: MatrixHistogramType.events,
    stackByField: 'event.category',
    skip: true,
  });

  return { isHistogramLoading, inspect, refetch, totalCount, data, start };
};
