/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SloClient } from '@kbn/slo-plugin/server';
import type { EntitiesAPIRouteHandlerResources } from '../../routes/types';

export async function createSloClient(
  resources: Pick<EntitiesAPIRouteHandlerResources, 'request' | 'plugins'>
): Promise<SloClient> {
  return await resources.plugins.slo
    .start()
    .then((sloStart) => sloStart.getSloClientWithRequest(resources.request));
}
