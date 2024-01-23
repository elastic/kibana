/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import dateMath from '@kbn/datemath';
import { useEntityAnalyticsRoutes } from '../api';
import type { RiskScorePreviewRequestSchema } from '../../../../common/entity_analytics/risk_engine/risk_score_preview/request_schema';

export const useRiskScorePreview = ({
  data_view_id: dataViewId,
  range,
  filter,
}: RiskScorePreviewRequestSchema) => {
  const { fetchRiskScorePreview } = useEntityAnalyticsRoutes();

  return useQuery(['POST', 'FETCH_PREVIEW_RISK_SCORE', range, filter], async ({ signal }) => {
    const params: RiskScorePreviewRequestSchema = { data_view_id: dataViewId };
    if (range) {
      const startTime = dateMath.parse(range.start)?.utc().toISOString();
      const endTime = dateMath
        .parse(range.end, {
          roundUp: true,
        })
        ?.utc()
        .toISOString();

      if (startTime && endTime) {
        params.range = {
          start: startTime,
          end: endTime,
        };
      }
    }

    if (filter) {
      params.filter = filter;
    }

    const response = await fetchRiskScorePreview({ signal, params });

    return response;
  });
};
