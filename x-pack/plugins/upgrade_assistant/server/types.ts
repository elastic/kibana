/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, Logger, SavedObjectsServiceStart } from 'src/core/server';
import { CloudSetup } from '../../cloud/server';
import { CredentialStore } from './lib/reindexing/credential_store';
import { LicensingPluginSetup } from '../../licensing/server';
import { APMOSSPluginSetup } from '../../../../src/plugins/apm_oss/server';

export interface RouteDependencies {
  router: IRouter;
  apmOSS: APMOSSPluginSetup;
  credentialStore: CredentialStore;
  log: Logger;
  getSavedObjectsService: () => SavedObjectsServiceStart;
  licensing: LicensingPluginSetup;
  cloud?: CloudSetup;
}
