/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ALL_RESOURCE, RBAC_AUTH_SCOPE } from '../../common/constants';

// this will be changed to use the facility introduced by https://github.com/elastic/elasticsearch/issues/32777
export function checkPrivilegesAtAllResourcesFactory(server) {
  const { authorization } = server.plugins.security;
  const adminCluster = server.plugins.elasticsearch.getCluster('admin');
  const { callWithInternalUser } = adminCluster;
  const { savedObjects } = server;
  const internalSavedObjectsRepository = savedObjects.getSavedObjectsRepository(callWithInternalUser);

  const spacesPlugin = server.plugins.spaces;

  const getResources = async () => {
    if (!spacesPlugin || !spacesPlugin.enabled) {
      return [ALL_RESOURCE];
    }

    const { saved_objects: savedObjects } = internalSavedObjectsRepository.find({ type: 'space' });
    return [
      ALL_RESOURCE,
      ...savedObjects.map(space => space.id),
    ];
  };

  return async function checkPrivilegesAtAllResources(request) {
    const resources = await getResources();
    const checkPrivileges = authorization.checkPrivilegesWithRequest(request);
    return await checkPrivileges(resources, [authorization.actions.login]);
  };
}

export function initRbacAuthScope(server, xpackInfoFeature) {
  const checkPrivilegesAtAllResources = checkPrivilegesAtAllResourcesFactory(server);

  server.plugins.security.registerAuthScopeGetter(async (request) => {
    const { authorization } = server.plugins.security;

    // if they don't have security, we can't use RBAC
    if (!xpackInfoFeature.getLicenseCheckResults().allowRbac) {
      return [];
    }

    const { result } = await checkPrivilegesAtAllResources(request);

    // if they're legacy, we won't use RBAC
    if (result === authorization.CHECK_PRIVILEGES_RESULT.LEGACY) {
      return [];
    }

    // otherwise, we're gonna use RBAC
    return [RBAC_AUTH_SCOPE];
  });
}

