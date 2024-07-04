/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntitiesESClient } from '../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';

export async function hasEntitiesData(entitiesESClient: EntitiesESClient) {
  const params = {
    body: {
      terminate_after: 1,
      track_total_hits: true,
      size: 0,
    },
  };

  const resp = await entitiesESClient.search('has_historical_entities_data', params);
  return resp.hits.total.value > 0;
}
