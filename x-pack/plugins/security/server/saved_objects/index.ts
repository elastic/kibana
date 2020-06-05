/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CoreSetup,
  KibanaRequest,
  LegacyRequest,
  SavedObjectsClient,
} from '../../../../../src/core/server';
import { SecureSavedObjectsClientWrapper } from './secure_saved_objects_client_wrapper';
import { AuthorizationServiceSetup } from '../authorization';
import { SecurityAuditLogger } from '../audit';
import { SpacesService } from '../plugin';

interface SetupSavedObjectsParams {
  auditLogger: SecurityAuditLogger;
  authz: Pick<
    AuthorizationServiceSetup,
    'mode' | 'actions' | 'checkSavedObjectsPrivilegesWithRequest'
  >;
  savedObjects: CoreSetup['savedObjects'];
  getSpacesService(): SpacesService | undefined;
}

export function setupSavedObjects({
  auditLogger,
  authz,
  savedObjects,
  getSpacesService,
}: SetupSavedObjectsParams) {
  const getKibanaRequest = (request: KibanaRequest | LegacyRequest) =>
    request instanceof KibanaRequest ? request : KibanaRequest.from(request);

  savedObjects.setClientFactoryProvider(
    (repositoryFactory) => ({ request, includedHiddenTypes }) => {
      const kibanaRequest = getKibanaRequest(request);
      return new SavedObjectsClient(
        authz.mode.useRbacForRequest(kibanaRequest)
          ? repositoryFactory.createInternalRepository(includedHiddenTypes)
          : repositoryFactory.createScopedRepository(kibanaRequest, includedHiddenTypes)
      );
    }
  );

  savedObjects.addClientWrapper(Number.MAX_SAFE_INTEGER - 1, 'security', ({ client, request }) => {
    const kibanaRequest = getKibanaRequest(request);
    return authz.mode.useRbacForRequest(kibanaRequest)
      ? new SecureSavedObjectsClientWrapper({
          actions: authz.actions,
          auditLogger,
          baseClient: client,
          checkSavedObjectsPrivilegesAsCurrentUser: authz.checkSavedObjectsPrivilegesWithRequest(
            kibanaRequest
          ),
          errors: SavedObjectsClient.errors,
          getSpacesService,
        })
      : client;
  });
}
