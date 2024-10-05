/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { EntitiesAPIRouteHandlerResources } from '../../routes/types';

export async function createRulesClient(
  resources: Pick<EntitiesAPIRouteHandlerResources, 'request' | 'plugins'>
): Promise<RulesClient> {
  return await resources.plugins.alerting
    .start()
    .then((alertingStart) => alertingStart.getRulesClientWithRequest(resources.request));
}
