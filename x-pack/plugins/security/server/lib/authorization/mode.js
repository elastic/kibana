/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GLOBAL_RESOURCE } from '../../../common/constants';
import { spaceApplicationPrivilegesSerializer } from './space_application_privileges_serializer';

const hasAnyPrivileges = privileges => {
  return Object.values(privileges).some(hasPrivilege => hasPrivilege === true);
};

const hasAnyResourcePrivileges = resourcePrivileges => {
  return Object.values(resourcePrivileges).some(resource => hasAnyPrivileges(resource));
};

export function authorizationModeFactory(
  actions,
  checkPrivilegesWithRequest,
  config,
  log,
  plugins,
  savedObjects,
  xpackInfoFeature,
) {
  const useRbacForRequestCache = new WeakMap();

  // TODO: This logic will change once we have the ES API to list all privileges
  // and is not covered by unit tests currently
  const shouldUseRbacForRequest = async (request) => {
    if (!config.get('xpack.security.authorization.legacyFallback.enabled')) {
      return true;
    }

    const adminCluster = plugins.elasticsearch.getCluster('admin');
    const { callWithInternalUser } = adminCluster;

    const internalSavedObjectsRepository = savedObjects.getSavedObjectsRepository(
      callWithInternalUser
    );

    const checkPrivileges = checkPrivilegesWithRequest(request);
    if (!plugins.spaces) {
      const { privileges } = await checkPrivileges.globally(actions.login);
      return hasAnyPrivileges(privileges);
    }

    const { saved_objects: spaceSavedObjects } = await internalSavedObjectsRepository.find({ type: 'space' });
    const spaceResources = spaceSavedObjects.map(space => spaceApplicationPrivilegesSerializer.resource.serialize(space.id));
    const allResources = [GLOBAL_RESOURCE, ...spaceResources];
    const { resourcePrivileges } = await checkPrivileges.atResources(allResources, actions.login);
    return hasAnyResourcePrivileges(resourcePrivileges);
  };

  const isRbacEnabled = () => xpackInfoFeature.getLicenseCheckResults().allowRbac;

  return {
    async initialize(request) {
      if (useRbacForRequestCache.has(request)) {
        log(['security', 'debug'], `Authorization mode is already initialized`);
        return;
      }

      if (!isRbacEnabled()) {
        useRbacForRequestCache.set(request, true);
        return;
      }

      const result = await shouldUseRbacForRequest(request);
      useRbacForRequestCache.set(request, result);
    },

    useRbacForRequest(request) {
      // the following can happen when the user isn't authenticated. Either true or false would work here,
      // but we're going to go with false as this is closer to the "legacy" behavior
      if (!useRbacForRequestCache.has(request)) {
        return false;
      }

      return useRbacForRequestCache.get(request);
    },
  };
}
