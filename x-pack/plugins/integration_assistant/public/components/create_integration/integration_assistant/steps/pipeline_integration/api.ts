/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  CheckPipelineApiRequest,
  CheckPipelineApiResponse,
} from '../../../../../../common/types';
import type {
  EcsMappingApiRequest,
  EcsMappingApiResponse,
  CategorizationApiRequest,
  CategorizationApiResponse,
  RelatedApiRequest,
  RelatedApiResponse,
} from '../../../../../../common';
import {
  ECS_GRAPH_PATH,
  CATEGORIZATION_GRAPH_PATH,
  RELATED_GRAPH_PATH,
  CHECK_PIPELINE_PATH,
} from '../../../../../../common';

export const runEcsGraph = async (
  body: EcsMappingApiRequest,
  { http, abortSignal }: { http: HttpSetup; abortSignal: AbortSignal }
): Promise<EcsMappingApiResponse> =>
  http.post<EcsMappingApiResponse>(ECS_GRAPH_PATH, {
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export const runCategorizationGraph = async (
  body: CategorizationApiRequest,
  { http, abortSignal }: { http: HttpSetup; abortSignal: AbortSignal }
): Promise<CategorizationApiResponse> =>
  http.post<CategorizationApiResponse>(CATEGORIZATION_GRAPH_PATH, {
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export const runRelatedGraph = async (
  body: RelatedApiRequest,
  { http, abortSignal }: { http: HttpSetup; abortSignal: AbortSignal }
): Promise<RelatedApiResponse> =>
  http.post<RelatedApiResponse>(RELATED_GRAPH_PATH, {
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export const runCheckPipelineResults = async (
  body: CheckPipelineApiRequest,
  { http, abortSignal }: { http: HttpSetup; abortSignal: AbortSignal }
): Promise<CheckPipelineApiResponse> =>
  http.post<CheckPipelineApiResponse>(CHECK_PIPELINE_PATH, {
    body: JSON.stringify(body),
    signal: abortSignal,
  });
