/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'kibana/server';
import { registerMapToIndexPipelineRoute } from './mapper_ingest_pipeline';

interface RegisterRoutesParams {
  router: IRouter;
}

export function registerRoutes(options: RegisterRoutesParams) {
  const { router } = options;
  registerMapToIndexPipelineRoute(router);
}
