/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'kibana/server';
import { ILicenseState } from '../lib';
import { defineLegacyRoutes } from './legacy';
import { AlertingRequestHandlerContext } from '../types';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';
import { createRuleRoute } from './create_rule';

export function defineRoutes(
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) {
  defineLegacyRoutes(router, licenseState, encryptedSavedObjects);
  createRuleRoute(router, licenseState);
}
