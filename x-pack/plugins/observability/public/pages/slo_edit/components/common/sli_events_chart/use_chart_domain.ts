/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetPreviewDataByGroupResponse, GetPreviewDataResponse } from '@kbn/slo-schema';
import { max, min } from 'lodash';
import { useMemo } from 'react';

export const useChartDomain = ({
  previewData,
  threshold,
}: {
  previewData?: GetPreviewDataResponse | GetPreviewDataByGroupResponse;
  threshold?: number;
}) => {
  return useMemo(() => {
    const values = ((previewData as GetPreviewDataResponse) || []).map((row) => row.sliValue);
    const maxValue = max(values);
    const minValue = min(values);
    const domain = {
      fit: true,
      min:
        threshold != null && minValue != null && threshold < minValue ? threshold : minValue || NaN,
      max:
        threshold != null && maxValue != null && threshold > maxValue ? threshold : maxValue || NaN,
    };
    return {
      domain,
      maxValue,
      minValue,
    };
  }, [threshold, previewData]);
};
