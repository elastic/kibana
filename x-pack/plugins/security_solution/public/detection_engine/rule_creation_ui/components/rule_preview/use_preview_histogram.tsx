/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { DataViewBase } from '@kbn/es-query';
import { useMatrixHistogramCombined } from '../../../../common/containers/matrix_histogram';
import { MatrixHistogramType } from '../../../../../common/search_strategy';
import { convertToBuildEsQuery } from '../../../../common/lib/kuery';
import { useKibana } from '../../../../common/lib/kibana';
import { QUERY_PREVIEW_ERROR } from './translations';
import { DEFAULT_PREVIEW_INDEX } from '../../../../../common/constants';

interface PreviewHistogramParams {
  previewId: string | undefined;
  endDate: string;
  startDate: string;
  spaceId: string;
  ruleType: Type;
  indexPattern: DataViewBase | undefined;
  skip?: boolean;
}

export const usePreviewHistogram = ({
  previewId,
  startDate,
  endDate,
  spaceId,
  ruleType,
  indexPattern,
  skip,
}: PreviewHistogramParams) => {
  const { uiSettings } = useKibana().services;

  const [filterQuery, error] = convertToBuildEsQuery({
    config: getEsQueryConfig(uiSettings),
    indexPattern,
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
      skip: skip || error != null,
    };
  }, [endDate, filterQuery, spaceId, stackByField, startDate, skip, error]);

  return useMatrixHistogramCombined(matrixHistogramRequest);
};
