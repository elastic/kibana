/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import {
  ECS_GRAPH_PATH,
  CATEGORZATION_GRAPH_PATH,
  RELATED_GRAPH_PATH,
  INTEGRATION_BUILDER_PATH,
} from '../common';

export interface Services {
  runEcsGraph: () => Promise<number | IHttpFetchError>;
  runCategorizationGraph: () => Promise<number | IHttpFetchError>;
  runRelatedGraph: () => Promise<number | IHttpFetchError>;
  runIntegrationBuilder: () => Promise<number | IHttpFetchError>;
}

export function getServices(core: CoreStart): Services {
  return {
    runEcsGraph: async () => {
      try {
        const response = await core.http.fetch<{}>(ECS_GRAPH_PATH);
        return response;
      } catch (e) {
        return e;
      }
    },
    runCategorizationGraph: async () => {
      try {
        const response = await core.http.fetch<{}>(CATEGORZATION_GRAPH_PATH);
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
