/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, MultitenancyServiceSetup } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';

import type { AuditServiceSetup } from '../audit';
import type { AuthorizationServiceSetupInternal } from '../authorization';
import { SavedObjectsSecurityExtension } from './saved_objects_security_extension';

interface SetupSavedObjectsParams {
  audit: AuditServiceSetup;
  authz: Pick<
    AuthorizationServiceSetupInternal,
    'mode' | 'actions' | 'checkSavedObjectsPrivilegesWithRequest'
  >;
  savedObjects: CoreSetup['savedObjects'];
  multitenancy: MultitenancyServiceSetup;
}

export function setupSavedObjects({
  audit,
  authz,
  savedObjects,
  multitenancy,
}: SetupSavedObjectsParams) {
  savedObjects.setClientFactoryProvider(
    // This is not used by Kibana itself, but it can be leveraged for Kibana to use a third-party authentication header if there is a custom
    // authentication layer sitting between Kibana and Elasticsearch, and if Elasticsearch security is disabled. It's unclear if it's even
    // possible for that to function anymore, perhaps we should deprecate this custom client factory provider and remove it in 9.0?
    (repositoryFactory) =>
      ({ request, includedHiddenTypes, extensions }) => {
        if (authz.mode.useRbacForRequest(request)) {
          const tenantId = multitenancy.getTenantIdFromRequest(request);
          return repositoryFactory.createTenantRepository(
            tenantId,
            includedHiddenTypes,
            extensions
          );
        } else {
          return repositoryFactory.createScopedRepository(request, includedHiddenTypes, extensions);
        }
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
