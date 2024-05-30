/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  EcsMappingApiRequest,
  EcsMappingApiResponse,
  CategorizationApiRequest,
  CategorizationApiResponse,
  RelatedApiRequest,
  RelatedApiResponse,
  BuildIntegrationApiRequest,
} from '../../../../../common';
import {
  ECS_GRAPH_PATH,
  CATEGORIZATION_GRAPH_PATH,
  RELATED_GRAPH_PATH,
  INTEGRATION_BUILDER_PATH,
} from '../../../../../common';

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

export const runIntegrationBuilder = async (
  body: BuildIntegrationApiRequest,
  { http, abortSignal }: { http: HttpSetup; abortSignal: AbortSignal }
): Promise<Buffer> =>
  http.post<Buffer>(INTEGRATION_BUILDER_PATH, {
    body: JSON.stringify(body),
    signal: abortSignal,
  });
