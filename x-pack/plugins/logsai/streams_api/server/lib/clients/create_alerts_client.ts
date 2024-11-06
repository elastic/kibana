/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import type { StreamsAPIRouteHandlerResources } from '../../routes/types';

export async function createAlertsClient(
  resources: Pick<StreamsAPIRouteHandlerResources, 'request' | 'plugins'>
): Promise<AlertsClient> {
  return await resources.plugins.ruleRegistry
    .start()
    .then((ruleRegistry) => ruleRegistry.getRacClientWithRequest(resources.request));
}
