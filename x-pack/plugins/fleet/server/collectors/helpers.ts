/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from 'kibana/server';

import type { ISavedObjectsRepository, ElasticsearchClient } from 'src/core/server';

export async function getInternalClients(
  core: CoreSetup
): Promise<[ISavedObjectsRepository, ElasticsearchClient]> {
  return core.getStartServices().then(async ([coreStart]) => {
    const savedObjectsRepo = coreStart.savedObjects.createInternalRepository();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    return [savedObjectsRepo, esClient];
  });
}
