/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityClient } from '@kbn/entityManager-plugin/server/lib/entity_client';
import type { EntitiesAPIRouteHandlerResources } from '../../routes/types';

export async function createEntityClient({
  plugins,
  request,
}: Pick<EntitiesAPIRouteHandlerResources, 'request' | 'plugins'>): Promise<EntityClient> {
  return await plugins.entityManager
    .start()
    .then((entityManagerStart) => entityManagerStart.getScopedClient({ request }));
}
