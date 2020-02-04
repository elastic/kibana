/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, SavedObjectsClientContract } from 'kibana/server';
import { Authentication } from '../../../../../security/server';

export interface AuthcHandlerArgs {
  getInternalSavedObjectsClient: RouteDependencies['getInternalSavedObjectsClient'];
  username: string;
}

export interface RouteDependencies {
  getInternalSavedObjectsClient: () => SavedObjectsClientContract;
  authc: Authentication;
  router: IRouter;
}
