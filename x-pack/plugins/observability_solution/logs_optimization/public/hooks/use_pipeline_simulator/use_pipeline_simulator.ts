/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useAsyncFn from 'react-use/lib/useAsyncFn';
import {
  GetRecommendationsRequestQuery,
  GetRecommendationsResponsePayload,
} from '../../../common/latest';
import { RecommendationsServiceStart } from '../../services/recommendations';

interface UsePipelineSimulatorFactoryDeps {
  recommendationsService: RecommendationsServiceStart;
}

export type UsePipelineSimulatorParams = GetRecommendationsRequestQuery;

export interface UsePipelineSimulatorReturnType {
  simulation: any | undefined;
  loading: boolean;
  error: Error | undefined;
  simulate: ReturnType<typeof useAsyncFn>[1];
}

export type UsePipelineSimulatorHook = () => UsePipelineSimulatorReturnType;

export const createUsePipelineSimulatorHook = ({
  recommendationsService,
}: UsePipelineSimulatorFactoryDeps): UsePipelineSimulatorHook => {
  return () => {
    const [{ error, loading, value }, load] = useAsyncFn(async (params) => {
      const client = await recommendationsService.getClient();
      return client.simulatePipeline(params);
    }, []);

    return { simulation: value, loading, error, simulate: load };
  };
};
