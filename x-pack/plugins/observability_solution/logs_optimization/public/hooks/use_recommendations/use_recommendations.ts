/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { Recommendation } from '../../../common/recommendations';
import {
  ApplyRecommendationRequestPayload,
  GetRecommendationsRequestQuery,
  GetRecommendationsResponsePayload,
} from '../../../common/latest';
import { RecommendationsServiceStart } from '../../services/recommendations';

interface UseRecommendationsFactoryDeps {
  recommendationsService: RecommendationsServiceStart;
}

export type UseRecommendationsParams = GetRecommendationsRequestQuery;

export type ApplyRecommendationHandler = (
  recommendationId: string,
  payload: ApplyRecommendationRequestPayload
) => Promise<Recommendation>;

export interface UseRecommendationsReturnType {
  recommendations: GetRecommendationsResponsePayload['recommendations'] | undefined;
  loading: boolean;
  error: Error | undefined;
  applyRecommendation: ApplyRecommendationHandler;
  isApplyingRecommendation: boolean;
}

export type UseRecommendationsHook = (
  params: UseRecommendationsParams,
  deps?: Parameters<typeof useAsyncFn>[1]
) => UseRecommendationsReturnType;

export const createUseRecommendationsHook = ({
  recommendationsService,
}: UseRecommendationsFactoryDeps): UseRecommendationsHook => {
  return (params, deps) => {
    const [{ error, loading, value }, load] = useAsyncFn(async () => {
      const client = await recommendationsService.getClient();
      return client.find(params);
    }, deps);

    const [{ loading: isApplyingRecommendation }, applyRecommendation] = useAsyncFn(
      async (recommendationId: string, payload: ApplyRecommendationRequestPayload) => {
        const client = await recommendationsService.getClient();
        const { recommendation: updatedRecommendation } = await client.applyOne(
          recommendationId,
          payload
        );

        await load();

        return updatedRecommendation;
      },
      [load]
    );

    useEffect(() => {
      load();
    }, [load]);

    return {
      recommendations: value?.recommendations,
      loading,
      error,
      applyRecommendation,
      isApplyingRecommendation,
    };
  };
};
