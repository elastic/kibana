/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

/**
 * Reads Cross-Project Search routing from the incoming Kibana request header
 * so Elasticsearch queries can apply the same routing as the browser session.
 */
export function getProjectRoutingFromRequest(request?: KibanaRequest): string | undefined {
  if (!request) {
    return undefined;
  }
  const rawProjectRouting = request.headers['x-project-routing'];
  return Array.isArray(rawProjectRouting) ? rawProjectRouting[0] : rawProjectRouting;
}
