/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { useMatrixHistogramCombined } from '../../../../common/containers/matrix_histogram';
import { MatrixHistogramType } from '../../../../../common/search_strategy';
import { convertToBuildEsQuery } from '../../../../common/lib/keury';
import { useKibana } from '../../../../common/lib/kibana';
import { QUERY_PREVIEW_ERROR } from './translations';
import { DEFAULT_PREVIEW_INDEX } from '../../../../../common/constants';

interface PreviewHistogramParams {
  previewId: string | undefined;
  endDate: string;
  startDate: string;
  spaceId: string;
  index: string[];
  ruleType: Type;
}

export const usePreviewHistogram = ({
  previewId,
  startDate,
  endDate,
  spaceId,
  index,
  ruleType,
}: PreviewHistogramParams) => {
  const { uiSettings } = useKibana().services;

  const [filterQuery, error] = convertToBuildEsQuery({
    config: getEsQueryConfig(uiSettings),
    indexPattern: {
      fields: [],
      title: index.join(),
    },
    queries: [{ query: `kibana.alert.rule.uuid:${previewId}`, language: 'kuery' }],
    filters: [],
  });

  const stackByField = useMemo(() => {
    return ruleType === 'machine_learning' ? 'host.name' : 'event.category';
  }, [ruleType]);

  const matrixHistogramRequest = useMemo(() => {
    return {
      endDate,
      errorMessage: QUERY_PREVIEW_ERROR,
      filterQuery,
      histogramType: MatrixHistogramType.preview,
      indexNames: [`${DEFAULT_PREVIEW_INDEX}-${spaceId}`],
      stackByField,
      startDate,
      includeMissingData: false,
      skip: error != null,
    };
  }, [startDate, endDate, filterQuery, spaceId, error, stackByField]);

  return useMatrixHistogramCombined(matrixHistogramRequest);
};
