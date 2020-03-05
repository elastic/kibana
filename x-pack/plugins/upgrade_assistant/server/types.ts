/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, Logger, SavedObjectsServiceStart } from 'src/core/server';
import { CloudSetup } from '../../cloud/server';
import { CredentialStore } from './lib/reindexing/credential_store';
import { LicensingPluginSetup } from '../../licensing/server';

export interface RouteDependencies {
  router: IRouter;
  credentialStore: CredentialStore;
  log: Logger;
  getSavedObjectsService: () => SavedObjectsServiceStart;
  licensing: LicensingPluginSetup;
  cloud?: CloudSetup;
}
