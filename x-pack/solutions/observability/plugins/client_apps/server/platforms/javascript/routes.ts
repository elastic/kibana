/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';

/**
 * Registers server-side routes for JavaScript source map resolution.
 * TODO: Implement source map upload + symbolication endpoints.
 */
export function registerJavascriptRoutes(_params: { router: IRouter; logger: Logger }) {
  // Future: POST /internal/client_apps/javascript/sourcemap
}
