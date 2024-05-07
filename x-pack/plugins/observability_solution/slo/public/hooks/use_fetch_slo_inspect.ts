/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsCompositeAggregationSource,
  TransformPutTransformRequest,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { CreateSLOInput, SLODefinitionResponse } from '@kbn/slo-schema';
import { useQuery } from '@tanstack/react-query';
import { createEsParams } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '../utils/kibana_react';

interface SLOInspectResponse {
  slo: SLODefinitionResponse;
  pipeline: Record<string, any>;
  rollUpTransform: TransformPutTransformRequest['body'];
  summaryTransform: TransformPutTransformRequest;
  temporaryDoc: Record<string, any>;
}

export function useFetchSloInspect(slo: CreateSLOInput, shouldInspect: boolean) {
  const { http } = useKibana().services;

  const { isLoading, isError, isSuccess, data } = useQuery({
    queryKey: ['slo', 'inspect'],
    queryFn: async ({ signal }) => {
      try {
        const body = JSON.stringify(slo);
        const response = await http.post<SLOInspectResponse>(
          '/internal/api/observability/slos/_inspect',
          {
            body,
            signal,
          }
        );

        return response;
      } catch (error) {
        // ignore error
      }
    },
    enabled: shouldInspect,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  let transformQueryString: string = '';

  const rollupTransform = data?.rollUpTransform;

  if (rollupTransform) {
    const pivotGroupBy = rollupTransform.pivot?.group_by ?? {};
    const transformQuery = createEsParams({
      body: {
        size: 0,
        query: rollupTransform.source.query,
        runtime_mappings: rollupTransform.source.runtime_mappings,
        aggs: {
          groupBy: {
            composite: {
              sources: Object.keys(pivotGroupBy).map((key) => ({
                [key]: pivotGroupBy[key] as AggregationsCompositeAggregationSource,
              })),
            },
            aggs: rollupTransform?.pivot?.aggregations,
          },
        },
      },
    });

    transformQueryString = `POST ${rollupTransform.source.index}/_search\n${JSON.stringify(
      transformQuery.body,
      null,
      2
    )}`;
  }

  return {
    data,
    transformQueryString,
    isLoading,
    isSuccess,
    isError,
  };
}
