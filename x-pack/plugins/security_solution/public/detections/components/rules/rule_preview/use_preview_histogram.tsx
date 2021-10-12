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

// TODO: use CTI constant when backend becomes available
const DEFAULT_PREVIEW_INDEX = '.siem-preview-signals';

interface PreviewHistogramParams {
  previewId: string | undefined;
  endDate: string;
  startDate: string;
}

export const usePreviewHistogram = ({ previewId, startDate, endDate }: PreviewHistogramParams) => {
  const { uiSettings } = useKibana().services;
  const [filterQuery] = convertToBuildEsQuery({
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
    queries: [{ query: `signal.rule.id:${previewId}`, language: 'kuery' }],
    filters: [],
  });

  const matrixHistogramRequest = useMemo(() => {
    return {
      endDate,
      errorMessage: 'oops',
      filterQuery,
      histogramType: MatrixHistogramType.preview,
      indexNames: [`${DEFAULT_PREVIEW_INDEX}-*`],
      stackByField: 'signal.rule.id',
      startDate,
    };
  }, [startDate, endDate, filterQuery]);

  return useMatrixHistogram(matrixHistogramRequest);
};
