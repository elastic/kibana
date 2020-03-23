/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpSetup } from 'kibana/public';
import { setupRouteService } from './routes';

export async function setupIngestManager(http: HttpSetup) {
  await http.post(setupRouteService.getSetupPath());
}
