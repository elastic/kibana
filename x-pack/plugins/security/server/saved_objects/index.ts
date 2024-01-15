/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type { AuditServiceSetup } from '@kbn/security-plugin-types-server';

import { SavedObjectsSecurityExtension } from './saved_objects_security_extension';
import type { AuthorizationServiceSetupInternal } from '../authorization';

interface SetupSavedObjectsParams {
  audit: AuditServiceSetup;
  authz: Pick<
    AuthorizationServiceSetupInternal,
    'mode' | 'actions' | 'checkSavedObjectsPrivilegesWithRequest'
  >;
  savedObjects: CoreSetup['savedObjects'];
}

export function setupSavedObjects({ audit, authz, savedObjects }: SetupSavedObjectsParams) {
  savedObjects.setClientFactoryProvider(
    // This is not used by Kibana itself, but it can be leveraged for Kibana to use a third-party authentication header if there is a custom
    // authentication layer sitting between Kibana and Elasticsearch, and if Elasticsearch security is disabled. It's unclear if it's even
    // possible for that to function anymore, perhaps we should deprecate this custom client factory provider and remove it in 9.0?
    (repositoryFactory) =>
      ({ request, includedHiddenTypes, extensions }) => {
        return new SavedObjectsClient(
          authz.mode.useRbacForRequest(request)
            ? repositoryFactory.createInternalRepository(includedHiddenTypes, extensions)
            : repositoryFactory.createScopedRepository(request, includedHiddenTypes, extensions)
        );
      }
  );

  savedObjects.setSecurityExtension(({ request }) => {
    return authz.mode.useRbacForRequest(request)
      ? new SavedObjectsSecurityExtension({
          actions: authz.actions,
          auditLogger: audit.asScoped(request),
          checkPrivileges: authz.checkSavedObjectsPrivilegesWithRequest(request),
          errors: SavedObjectsClient.errors,
        })
      : undefined;
  });
}

export { SavedObjectsSecurityExtension };
