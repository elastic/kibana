/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, Logger, SavedObjectsServiceStart } from 'src/core/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { SecurityPluginStart } from '../../security/server';
import { CredentialStore } from './lib/reindexing/credential_store';
import { handleEsError } from './shared_imports';

export interface RouteDependencies {
  router: IRouter;
  credentialStore: CredentialStore;
  log: Logger;
  getSavedObjectsService: () => SavedObjectsServiceStart;
  getSecurityPlugin: () => SecurityPluginStart | undefined;
  licensing: LicensingPluginSetup;
  lib: {
    handleEsError: typeof handleEsError;
  };
  config: {
    isSecurityEnabled: () => boolean;
  };
}
