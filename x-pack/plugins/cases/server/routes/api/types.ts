/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, PluginInitializerContext } from 'kibana/server';

import type { CasesRouter } from '../../types';

export interface RouteDeps {
  router: CasesRouter;
  logger: Logger;
  kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
}

export interface TotalCommentByCase {
  caseId: string;
  totalComments: number;
}
