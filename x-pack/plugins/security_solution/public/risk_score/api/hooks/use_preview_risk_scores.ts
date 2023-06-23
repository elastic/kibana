/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import dateMath from '@kbn/datemath';
import { fetchPreviewRiskScore } from '../api';
import { RiskScorePreviewRequestSchema } from '../../../../common/risk_engine/risk_score_preview/request_schema';
/**
 *
 */
export const useRiskScorePreview = ({ range }: RiskScorePreviewRequestSchema) => {
  return useQuery(['POST', 'FETCH_PREVIEW_RISK_SCORE', range], async ({ signal }) => {
    const params: RiskScorePreviewRequestSchema = {};

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

    const response = await fetchPreviewRiskScore({ signal, params });

    return response;
  });
};
