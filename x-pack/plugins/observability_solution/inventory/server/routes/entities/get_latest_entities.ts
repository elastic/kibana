/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LatestEntity } from '../../../common/entities';
import { EntitiesESClient } from '../../lib/create_es_client/create_entities_es_client';

const MAX_NUMBER_OF_ENTITIES = 500;

export async function getLatestEntities({
  entitiesESClient,
}: {
  entitiesESClient: EntitiesESClient;
}) {
  const response = (
    await entitiesESClient.searchLatest<LatestEntity>('get_latest_entities', {
      body: {
        size: MAX_NUMBER_OF_ENTITIES,
      },
    })
  ).hits.hits.map((hit) => hit._source);

  return response;
}
