/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

import { registerSearchApiKeysRoutes } from '@kbn/search-api-keys-server';
import { registerIndicesRoutes } from './indices';
import { registerStatusRoutes } from './status';
import { registerDocumentRoutes } from './documents';

export function defineRoutes(router: IRouter, logger: Logger) {
  registerIndicesRoutes(router, logger);
  registerStatusRoutes(router, logger);
  registerSearchApiKeysRoutes(router, logger);
  registerDocumentRoutes(router, logger);
}
