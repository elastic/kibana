/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/server';
import { ElasticsearchClient, SavedObjectsClient } from '../../../../../src/core/server';

export async function getInternalClients(
  core: CoreSetup
): Promise<[SavedObjectsClient, ElasticsearchClient]> {
  return core.getStartServices().then(async ([coreStart]) => {
    const savedObjectsRepo = coreStart.savedObjects.createInternalRepository();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    return [new SavedObjectsClient(savedObjectsRepo), esClient];
  });
}
