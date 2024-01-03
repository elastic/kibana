/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { FindSLOResponse, SLOResponse } from '@kbn/slo-schema';
import { QueryKey, useMutation } from '@tanstack/react-query';
import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { CreateSLOInput } from '@kbn/slo-schema';
import { useKibana } from '../../utils/kibana_react';

type ServerError = IHttpFetchError<ResponseErrorBody>;

interface SLOInspectResponse {
  slo: SLOResponse;
  pipeline: Record<string, any>;
  rollUpTransform: TransformPutTransformRequest;
  summaryTransform: TransformPutTransformRequest;
  temporaryDoc: Record<string, any>;
}

export function useInspectSlo() {
  const { http } = useKibana().services;

  return useMutation<
    SLOInspectResponse,
    ServerError,
    { slo: CreateSLOInput },
    { previousData?: FindSLOResponse; queryKey?: QueryKey }
  >(
    ['inspectSlo'],
    ({ slo }) => {
      const body = JSON.stringify(slo);
      return http.post<SLOInspectResponse>(`/internal/api/observability/slos/_inspect`, { body });
    },
    {}
  );
}
