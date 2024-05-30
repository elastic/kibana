/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import {
  EcsMappingApiRequest,
  EcsMappingApiResponse,
  CategorizationApiRequest,
  CategorizationApiResponse,
  RelatedApiRequest,
  RelatedApiResponse,
  BuildIntegrationApiRequest,
  TestPipelineApiRequest,
  TestPipelineApiResponse,
} from '../common';
import {
  ECS_GRAPH_PATH,
  CATEGORIZATION_GRAPH_PATH,
  RELATED_GRAPH_PATH,
  INTEGRATION_BUILDER_PATH,
  TEST_PIPELINE_PATH,
} from '../common';

export interface Services {
  runEcsGraph: (req: EcsMappingApiRequest) => Promise<EcsMappingApiResponse | IHttpFetchError>;
  runCategorizationGraph: (
    req: CategorizationApiRequest
  ) => Promise<CategorizationApiResponse | IHttpFetchError>;
  runRelatedGraph: (req: RelatedApiRequest) => Promise<RelatedApiResponse | IHttpFetchError>;
  runIntegrationBuilder: (req: BuildIntegrationApiRequest) => Promise<Buffer | IHttpFetchError>;
  testPipeline: (req: TestPipelineApiRequest) => Promise<TestPipelineApiResponse | IHttpFetchError>;
}

export function getServices(core: CoreStart): Services {
  return {
    runEcsGraph: async (req: EcsMappingApiRequest): Promise<EcsMappingApiResponse> => {
      try {
        const response = await core.http.post<EcsMappingApiResponse>(ECS_GRAPH_PATH, {
          body: JSON.stringify({ ...req }),
        });
        return response;
      } catch (e) {
        return e;
      }
    },
    runCategorizationGraph: async (
      req: CategorizationApiRequest
    ): Promise<CategorizationApiResponse> => {
      try {
        const response = await core.http.post<CategorizationApiResponse>(
          CATEGORIZATION_GRAPH_PATH,
          {
            body: JSON.stringify({ ...req }),
          }
        );
        return response;
      } catch (e) {
        return e;
      }
    },
    runRelatedGraph: async (req: RelatedApiRequest): Promise<RelatedApiResponse> => {
      try {
        const response = await core.http.post<RelatedApiResponse>(RELATED_GRAPH_PATH, {
          body: JSON.stringify({ ...req }),
        });
        return response;
      } catch (e) {
        return e;
      }
    },
    runIntegrationBuilder: async (req: BuildIntegrationApiRequest): Promise<Buffer> => {
      try {
        const response = await core.http.post<Buffer>(INTEGRATION_BUILDER_PATH, {
          body: JSON.stringify({ ...req }),
        });
        return response;
      } catch (e) {
        return e;
      }
    },
    testPipeline: async (req: TestPipelineApiRequest): Promise<TestPipelineApiResponse> => {
      try {
        const response = await core.http.post<TestPipelineApiResponse>(TEST_PIPELINE_PATH, {
          body: JSON.stringify({ ...req }),
        });
        return response;
      } catch (e) {
        return e;
      }
    },
  };
}
