/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsService } from 'src/core/server';
import { Legacy } from 'kibana';
import { SavedObjectsClientWrapperOptions } from 'src/core/server/saved_objects/service/lib';
import { OptionalPlugin } from '../../../../../../server/lib/optional_plugin';
import { SpacesPlugin } from '../../../../../spaces/types';
import { AuthorizationService } from '../service';
import { ensureSavedObjectsPrivilegesFactory } from './ensure_saved_objects_privileges';
import { SecureSavedObjectsClientWrapper } from './secure_saved_objects_client_wrapper';

interface WrapperFactoryDeps {
  authorization: AuthorizationService;
  spaces: OptionalPlugin<SpacesPlugin>;
  savedObjects: SavedObjectsService;
  auditLogger: any;
}

export const SECURE_SOC_WRAPPER_PRIORITY = Number.MAX_SAFE_INTEGER - 1;

export const createSecureSavedObjectsWrapperFactory = ({
  authorization,
  spaces,
  savedObjects,
  auditLogger,
}: WrapperFactoryDeps) => {
  return function secureSavedObjectsWrapperFactory({
    client,
    request,
  }: SavedObjectsClientWrapperOptions<Legacy.Request>) {
    if (authorization.mode.useRbacForRequest(request)) {
      const ensureSavedObjectsPrivileges = ensureSavedObjectsPrivilegesFactory({
        spacesEnabled: spaces.isEnabled,
        checkPrivileges: authorization.checkPrivilegesWithRequest(request),
        actionsService: authorization.actions,
        errors: savedObjects.SavedObjectsClient.errors,
        auditLogger,
      });

      return new SecureSavedObjectsClientWrapper({
        baseClient: client,
        ensureSavedObjectsPrivileges,
        errors: savedObjects.SavedObjectsClient.errors,
      });
    }

    return client;
  };
};
