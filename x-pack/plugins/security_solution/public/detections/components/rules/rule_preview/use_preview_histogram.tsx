/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { useMatrixHistogram } from '../../../../common/containers/matrix_histogram';
import { MatrixHistogramType } from '../../../../../common/search_strategy';
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
  index: string[];
  ruleType: Type;
}

export const usePreviewHistogram = ({
  previewId,
  startDate,
  endDate,
  spaceId,
  threshold,
  query,
  index,
  ruleType,
}: PreviewHistogramParams) => {
  const { uiSettings } = useKibana().services;
  const {
    query: { query: queryString, language },
    filters,
  } = query;

  const [filterQuery, error] = convertToBuildEsQuery({
    config: getEsQueryConfig(uiSettings),
    indexPattern: {
      fields: [],
      title: index.join(),
    },
    queries: [
      { query: `signal.rule.id:${previewId}`, language: 'kuery' },
      { query: queryString, language },
    ],
    filters,
  });

  const stackByField = useMemo(() => {
    const stackByDefault = ruleType === 'machine_learning' ? 'host.name' : 'event.category';
    return threshold?.field[0] ?? stackByDefault;
  }, [threshold, ruleType]);

  const matrixHistogramRequest = useMemo(() => {
    return {
      endDate,
      errorMessage: QUERY_PREVIEW_ERROR,
      filterQuery,
      histogramType: MatrixHistogramType.preview,
      indexNames: [`${DEFAULT_PREVIEW_INDEX}-${spaceId}`],
      stackByField,
      startDate,
      threshold,
      includeMissingData: false,
      skip: error != null,
    };
  }, [startDate, endDate, filterQuery, spaceId, error, threshold, stackByField]);

  return useMatrixHistogram(matrixHistogramRequest);
};
