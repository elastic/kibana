/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ALL_RESOURCE } from '../../../common/constants';

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
  resources,
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

    const getResources = async () => {
      if (!plugins.spaces) {
        return [ALL_RESOURCE];
      }

      const { saved_objects: savedObjects } = await internalSavedObjectsRepository.find({ type: 'space' });
      return [ALL_RESOURCE, ...savedObjects.map(space => resources.getSpaceResource(space.id))];
    };

    const checkPrivileges = checkPrivilegesWithRequest(request);
    const { response } = await checkPrivileges(await getResources(), [actions.login]);
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
