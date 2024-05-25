/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { EcsMappingApiRequest, EcsMappingApiResponse } from '../common';
import {
  ECS_GRAPH_PATH,
  CATEGORIZATION_GRAPH_PATH,
  RELATED_GRAPH_PATH,
  INTEGRATION_BUILDER_PATH,
} from '../common';

export interface Services {
  runEcsGraph: (req: EcsMappingApiRequest) => Promise<EcsMappingApiResponse | IHttpFetchError>;
  runCategorizationGraph: () => Promise<string | IHttpFetchError>;
  runRelatedGraph: () => Promise<string | IHttpFetchError>;
  runIntegrationBuilder: () => Promise<string | IHttpFetchError>;
}

export function getServices(core: CoreStart): Services {
  return {
    runEcsGraph: async (req: EcsMappingApiRequest) => {
      try {
        const response = await core.http.post(ECS_GRAPH_PATH, {});
        return response;
      } catch (e) {
        return e;
      }
    },
    runCategorizationGraph: async () => {
      try {
        const response = await core.http.fetch<{}>(CATEGORIZATION_GRAPH_PATH);
        return response;
      } catch (e) {
        return e;
      }
    },
    runRelatedGraph: async () => {
      try {
        const response = await core.http.fetch<{}>(RELATED_GRAPH_PATH);
        return response;
      } catch (e) {
        return e;
      }
    },
    runIntegrationBuilder: async () => {
      try {
        const response = await core.http.fetch<{}>(INTEGRATION_BUILDER_PATH);
        return response;
      } catch (e) {
        return e;
      }
    },
  };
}
