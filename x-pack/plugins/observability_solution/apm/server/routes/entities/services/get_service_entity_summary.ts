/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntitiesESClient } from '../../../lib/helpers/create_es_client/create_entities_es_client/create_entities_es_client';
import { withApmSpan } from '../../../utils/with_apm_span';
import { getEntityLatestServices } from '../get_entity_latest_services';
import { mergeEntities } from '../utils/merge_entities';

const MAX_NUMBER_OF_SERVICES = 1_000;

interface Params {
  entitiesESClient: EntitiesESClient;
  serviceName: string;
  environment: string;
}

export function getServiceEntitySummary({ entitiesESClient, environment, serviceName }: Params) {
  return withApmSpan('get_service_entity_summary', async () => {
    const entityLatestServices = await getEntityLatestServices({
      entitiesESClient,
      environment,
      size: MAX_NUMBER_OF_SERVICES,
      serviceName,
    });

    const serviceEntity = mergeEntities({ entities: entityLatestServices });
    return serviceEntity[0];
  });
}
