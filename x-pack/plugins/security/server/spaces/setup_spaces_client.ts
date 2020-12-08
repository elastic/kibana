/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesPluginSetup } from '../../../spaces/server';
import { AuditServiceSetup } from '../audit';
import { AuthorizationServiceSetup } from '../authorization';
import { LegacySpacesAuditLogger } from './legacy_audit_logger';
import { SecureSpacesClientWrapper } from './secure_spaces_client_wrapper';

interface Deps {
  audit: AuditServiceSetup;
  authz: AuthorizationServiceSetup;
  spaces?: SpacesPluginSetup;
}

export const setupSpacesClient = ({ audit, authz, spaces }: Deps) => {
  if (!spaces) {
    return;
  }
  const { spacesClient } = spaces;

  spacesClient.setClientRepositoryFactory((request, savedObjectsStart) => {
    if (authz.mode.useRbacForRequest(request)) {
      return savedObjectsStart.createInternalRepository(['space']);
    }
    return savedObjectsStart.createScopedRepository(request, ['space']);
  });

  const spacesAuditLogger = new LegacySpacesAuditLogger(audit.getLogger());

  spacesClient.registerClientWrapper(
    (request, baseClient) =>
      new SecureSpacesClientWrapper(baseClient, request, authz, spacesAuditLogger)
  );
};
