/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { useMatrixHistogram } from '../../../../common/containers/matrix_histogram';
import { MatrixHistogramType } from '../../../../../common';
import { convertToBuildEsQuery } from '../../../../common/lib/keury';
import { getEsQueryConfig } from '../../../../../../../../src/plugins/data/common';
import { useKibana } from '../../../../common/lib/kibana';
import { QUERY_PREVIEW_ERROR } from './translations';
import { DEFAULT_PREVIEW_INDEX } from '../../../../../common/constants';
import { FieldValueThreshold } from '../threshold_input';
import { FieldValueQueryBar } from '../query_bar';

interface PreviewHistogramParams {
  previewId: string | undefined;
  endDate: string;
  startDate: string;
  spaceId: string;
  threshold?: FieldValueThreshold;
  query: FieldValueQueryBar;
}

export const usePreviewHistogram = ({
  previewId,
  startDate,
  endDate,
  spaceId,
  threshold,
  query,
}: PreviewHistogramParams) => {
  const { uiSettings } = useKibana().services;
  const {
    query: { query: queryString, language },
    filters,
  } = query;

  const [filterQuery, error] = convertToBuildEsQuery({
    config: getEsQueryConfig(uiSettings),
    indexPattern: {
      fields: [
        {
          name: 'signal.rule.id',
          type: 'string',
        },
      ],
      title: 'Preview',
    },
    queries: [
      { query: `signal.rule.id:${previewId}`, language: 'kuery' },
      { query: queryString, language },
    ],
    filters,
  });

  const matrixHistogramRequest = useMemo(() => {
    return {
      endDate,
      errorMessage: QUERY_PREVIEW_ERROR,
      filterQuery,
      histogramType: MatrixHistogramType.preview,
      indexNames: [`${DEFAULT_PREVIEW_INDEX}-${spaceId}`],
      stackByField: threshold != null ? threshold.field[0] : 'event.category',
      startDate,
      threshold,
      skip: error != null,
    };
  }, [startDate, endDate, filterQuery, spaceId, error, threshold]);

  return useMatrixHistogram(matrixHistogramRequest);
};
