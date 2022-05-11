/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';

import type { AuditServiceSetup } from '../audit';
import type { AuthorizationServiceSetupInternal } from '../authorization';
import type { SpacesService } from '../plugin';
import { SecureSavedObjectsClientWrapper } from './secure_saved_objects_client_wrapper';

interface SetupSavedObjectsParams {
  audit: AuditServiceSetup;
  authz: Pick<
    AuthorizationServiceSetupInternal,
    'mode' | 'actions' | 'checkSavedObjectsPrivilegesWithRequest'
  >;
  savedObjects: CoreSetup['savedObjects'];
  getSpacesService(): SpacesService | undefined;
}

export type {
  EnsureAuthorizedDependencies,
  EnsureAuthorizedOptions,
  EnsureAuthorizedResult,
  EnsureAuthorizedActionResult,
} from './ensure_authorized';

export {
  ensureAuthorized,
  getEnsureAuthorizedActionResult,
  isAuthorizedForObjectInAllSpaces,
} from './ensure_authorized';

export function setupSavedObjects({
  audit,
  authz,
  savedObjects,
  getSpacesService,
}: SetupSavedObjectsParams) {
  savedObjects.setClientFactoryProvider(
    (repositoryFactory) =>
      ({ request, includedHiddenTypes }) => {
        return new SavedObjectsClient(
          authz.mode.useRbacForRequest(request)
            ? repositoryFactory.createInternalRepository(includedHiddenTypes)
            : repositoryFactory.createScopedRepository(request, includedHiddenTypes)
        );
      }
  );

  savedObjects.addClientWrapper(Number.MAX_SAFE_INTEGER - 1, 'security', ({ client, request }) => {
    return authz.mode.useRbacForRequest(request)
      ? new SecureSavedObjectsClientWrapper({
          actions: authz.actions,
          auditLogger: audit.asScoped(request),
          baseClient: client,
          checkSavedObjectsPrivilegesAsCurrentUser:
            authz.checkSavedObjectsPrivilegesWithRequest(request),
          errors: SavedObjectsClient.errors,
          getSpacesService,
        })
      : client;
  });
}
