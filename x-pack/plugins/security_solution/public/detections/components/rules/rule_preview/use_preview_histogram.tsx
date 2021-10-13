/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo, useState, useEffect } from 'react';
import { useMatrixHistogram } from '../../../../common/containers/matrix_histogram';
import { MatrixHistogramType } from '../../../../../common';
import { convertToBuildEsQuery } from '../../../../common/lib/keury';
import { getEsQueryConfig } from '../../../../../../../../src/plugins/data/common';
import { useKibana } from '../../../../common/lib/kibana';
import { QUERY_PREVIEW_ERROR } from './translations';

// TODO: use CTI constant when backend becomes available
const DEFAULT_PREVIEW_INDEX = '.siem-preview-signals';

interface PreviewHistogramParams {
  previewId: string | undefined;
  endDate: string;
  startDate: string;
}

export const usePreviewHistogram = ({ previewId, startDate, endDate }: PreviewHistogramParams) => {
  const { uiSettings, spaces } = useKibana().services;

  const [spaceId, setSpaceId] = useState('');
  useEffect(() => {
    spaces.getActiveSpace().then((space) => setSpaceId(space.id));
  }, [spaces]);

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
      errorMessage: QUERY_PREVIEW_ERROR,
      filterQuery,
      histogramType: MatrixHistogramType.preview,
      indexNames: [`${DEFAULT_PREVIEW_INDEX}-${spaceId}`],
      stackByField: 'signal.rule.id',
      startDate,
    };
  }, [startDate, endDate, filterQuery, spaceId]);

  return useMatrixHistogram(matrixHistogramRequest);
};
