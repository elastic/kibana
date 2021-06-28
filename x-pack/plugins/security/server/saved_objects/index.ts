/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, LegacyRequest } from 'src/core/server';

import { KibanaRequest, SavedObjectsClient } from '../../../../../src/core/server';
import type { AuditServiceSetup, SecurityAuditLogger } from '../audit';
import type { AuthorizationServiceSetupInternal } from '../authorization';
import type { SpacesService } from '../plugin';
import { SecureSavedObjectsClientWrapper } from './secure_saved_objects_client_wrapper';

interface SetupSavedObjectsParams {
  legacyAuditLogger: SecurityAuditLogger;
  audit: AuditServiceSetup;
  authz: Pick<
    AuthorizationServiceSetupInternal,
    'mode' | 'actions' | 'checkSavedObjectsPrivilegesWithRequest'
  >;
  savedObjects: CoreSetup['savedObjects'];
  getSpacesService(): SpacesService | undefined;
}

export function setupSavedObjects({
  legacyAuditLogger,
  audit,
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
          legacyAuditLogger,
          auditLogger: audit.asScoped(kibanaRequest),
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
