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
import { IntegrationSettings } from '../../types';

export const runEcsGraph = async (
  body: EcsMappingApiRequest,
  { http, abortSignal }: { http: HttpSetup; abortSignal: AbortSignal }
): Promise<EcsMappingApiResponse> => {
  // const req: EcsMappingApiRequest = {
  //   packageName: integrationSettings.name ?? '',
  //   dataStreamName: integrationSettings.dataStreamName ?? '',
  //   rawSamples: integrationSettings.logsSampleParsed ?? [],
  // };
  return http.post<EcsMappingApiResponse>(ECS_GRAPH_PATH, {
    body: JSON.stringify(body),
    signal: abortSignal,
  });
};

export const runCategorizationGraph = async (
  body: CategorizationApiRequest,
  { http, abortSignal }: { http: HttpSetup; abortSignal: AbortSignal }
): Promise<CategorizationApiResponse> => {
  return http.post<CategorizationApiResponse>(CATEGORIZATION_GRAPH_PATH, {
    body: JSON.stringify(body),
    signal: abortSignal,
  });
};

export const runRelatedGraph = async (
  req: RelatedApiRequest,
  { http, abortSignal }: { http: HttpSetup; abortSignal: AbortSignal }
): Promise<RelatedApiResponse> =>
  http.post<RelatedApiResponse>(RELATED_GRAPH_PATH, {
    body: JSON.stringify({ ...req }),
    signal: abortSignal,
  });

export const runIntegrationBuilder = async (
  req: BuildIntegrationApiRequest,
  { http, abortSignal }: { http: HttpSetup; abortSignal: AbortSignal }
): Promise<Buffer> =>
  http.post<Buffer>(INTEGRATION_BUILDER_PATH, {
    body: JSON.stringify({ ...req }),
    signal: abortSignal,
  });
