/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Plugin } from '@kbn/core/server';

import { ApiRoutes } from './routes';
import { handleEsError } from './shared_imports';
import { Dependencies } from './types';

export class IngestPipelinesPlugin implements Plugin<void, void, any, any> {
  private readonly apiRoutes: ApiRoutes;

  constructor() {
    this.apiRoutes = new ApiRoutes();
  }

  public setup({ http }: CoreSetup, { security, features }: Dependencies) {
    const router = http.createRouter();

    features.registerElasticsearchFeature({
      id: 'ingest_pipelines',
      management: {
        ingest: ['ingest_pipelines'],
      },
      privileges: [
        {
          ui: [],
          requiredClusterPrivileges: ['manage_pipeline', 'cluster:monitor/nodes/info'],
        },
      ],
    });

    this.apiRoutes.setup({
      router,
      config: {
        isSecurityEnabled: () => security !== undefined && security.license.isEnabled(),
      },
      lib: {
        handleEsError,
      },
    });
  }

  public start() {}

  public stop() {}
}
