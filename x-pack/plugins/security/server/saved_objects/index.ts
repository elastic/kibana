/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IClusterClient, KibanaRequest, LegacyRequest } from '../../../../../src/core/server';
import { SecureSavedObjectsClientWrapper } from './secure_saved_objects_client_wrapper';
import { LegacyAPI } from '../plugin';
import { Authorization } from '../authorization';
import { SecurityAuditLogger } from '../audit';

interface SetupSavedObjectsParams {
  adminClusterClient: IClusterClient;
  auditLogger: SecurityAuditLogger;
  authz: Pick<Authorization, 'mode' | 'actions' | 'checkSavedObjectsPrivilegesWithRequest'>;
  legacyAPI: Pick<LegacyAPI, 'savedObjects'>;
}

export function setupSavedObjects({
  adminClusterClient,
  auditLogger,
  authz,
  legacyAPI: { savedObjects },
}: SetupSavedObjectsParams) {
  const getKibanaRequest = (request: KibanaRequest | LegacyRequest) =>
    request instanceof KibanaRequest ? request : KibanaRequest.from(request);
  savedObjects.setScopedSavedObjectsClientFactory(({ request }) => {
    const kibanaRequest = getKibanaRequest(request);
    if (authz.mode.useRbacForRequest(kibanaRequest)) {
      const internalRepository = savedObjects.getSavedObjectsRepository(
        adminClusterClient.callAsInternalUser
      );
      return new savedObjects.SavedObjectsClient(internalRepository);
    }

    const callAsCurrentUserRepository = savedObjects.getSavedObjectsRepository(
      adminClusterClient.asScoped(kibanaRequest).callAsCurrentUser
    );
    return new savedObjects.SavedObjectsClient(callAsCurrentUserRepository);
  });

  savedObjects.addScopedSavedObjectsClientWrapperFactory(
    Number.MAX_SAFE_INTEGER - 1,
    'security',
    ({ client, request }) => {
      const kibanaRequest = getKibanaRequest(request);
      if (authz.mode.useRbacForRequest(kibanaRequest)) {
        return new SecureSavedObjectsClientWrapper({
          actions: authz.actions,
          auditLogger,
          baseClient: client,
          checkSavedObjectsPrivilegesAsCurrentUser: authz.checkSavedObjectsPrivilegesWithRequest(
            kibanaRequest
          ),
          errors: savedObjects.SavedObjectsClient.errors,
        });
      }

      return client;
    }
  );
}
