/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GLOBAL_RESOURCE } from '../../../common/constants';
import { spaceApplicationPrivilegesSerializer } from './space_application_privileges_serializer';

const hasAnyApplicationPrivileges = applicationPrivilegesResponse => {
  return Object.values(applicationPrivilegesResponse).some(resource =>
    Object.values(resource).some(action => action === true)
  );
};

export function authorizationModeFactory(
  actions,
  checkPrivilegesWithRequest,
  config,
  plugins,
  savedObjects,
  xpackInfoFeature
) {
  const useRbacForRequestWeakMap = new WeakMap();

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
      const { response } = await checkPrivileges.globally(actions.login);
      return hasAnyApplicationPrivileges(response);
    }

    const { saved_objects: spaceSavedObjects } = await internalSavedObjectsRepository.find({ type: 'space' });
    const spaceResources = spaceSavedObjects.map(space => spaceApplicationPrivilegesSerializer.resource.serialize(space.id));
    const allResources = [GLOBAL_RESOURCE, ...spaceResources];
    const { response } = await checkPrivileges.atResources(allResources, actions.login);
    return hasAnyApplicationPrivileges(response);
  };

  return {
    async initialize(request) {
      if (useRbacForRequestWeakMap.has(request)) {
        throw new Error('Authorization mode is already intitialized');
      }

      if (!this.isRbacEnabled()) {
        useRbacForRequestWeakMap.set(request, false);
        return;
      }

      const result = await shouldUseRbacForRequest(request);
      useRbacForRequestWeakMap.set(request, result);
    },

    useRbacForRequest(request) {
      return useRbacForRequestWeakMap.get(request);
    },

    isRbacEnabled() {
      return xpackInfoFeature.getLicenseCheckResults().allowRbac;
    },
  };
}
