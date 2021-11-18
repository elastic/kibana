/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchServiceStart,
  Logger,
  SavedObjectsClient,
} from '../../../../../../src/core/server';

import { LicensingPluginSetup } from '../../../../licensing/server';
import { SecurityPluginStart } from '../../../../security/server';
import { ReindexWorker } from '../../lib/reindexing';
import { CredentialStore } from '../../lib/reindexing/credential_store';

interface CreateReindexWorker {
  logger: Logger;
  elasticsearchService: ElasticsearchServiceStart;
  credentialStore: CredentialStore;
  savedObjects: SavedObjectsClient;
  licensing: LicensingPluginSetup;
  security: SecurityPluginStart;
}

export function createReindexWorker({
  logger,
  elasticsearchService,
  credentialStore,
  savedObjects,
  licensing,
  security,
}: CreateReindexWorker) {
  const esClient = elasticsearchService.client;
  return new ReindexWorker(savedObjects, credentialStore, esClient, logger, licensing, security);
}
