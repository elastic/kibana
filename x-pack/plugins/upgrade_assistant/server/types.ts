/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ElasticsearchServiceSetup,
  IRouter,
  Logger,
  SavedObjectsServiceStart,
} from 'kibana/server';
import { CloudSetup } from '../../cloud/server';
import { CredentialStore } from './lib/reindexing/credential_store';
import { SecurityPluginSetup } from '../../security/server';

export interface RouteDependencies {
  router: IRouter;
  elasticsearch: ElasticsearchServiceSetup;
  credentialStore: CredentialStore;
  log: Logger;
  getSavedObjectsService: () => SavedObjectsServiceStart;
  security?: SecurityPluginSetup;
  cloud?: CloudSetup;
}

export interface RequestShim {
  headers: Record<string, string>;
  payload: any;
  params: any;
}
