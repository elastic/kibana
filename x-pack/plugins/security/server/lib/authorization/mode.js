/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GLOBAL_RESOURCE } from '../../../common/constants';
import { spaceApplicationPrivilegesSerializer } from './space_application_privileges_serializer';

const hasAnyPrivileges = privileges => {
  return Object.values(privileges).some(hasPrivilege => hasPrivilege);
};

const hasAnyResourcePrivileges = resourcePrivileges => {
  return Object.values(resourcePrivileges).some(resource =>
    Object.values(resource).some(privilege => privilege === true)
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
      if (useRbacForRequestWeakMap.has(request)) {
        throw new Error('Authorization mode is already intitialized');
      }

      if (!isRbacEnabled()) {
        useRbacForRequestWeakMap.set(request, true);
        return;
      }

      const result = await shouldUseRbacForRequest(request);
      useRbacForRequestWeakMap.set(request, result);
    },

    useRbacForRequest(request) {
      if (!useRbacForRequestWeakMap.has(request)) {
        throw new Error(`Authorization mode is not initialized`);
      }

      return useRbacForRequestWeakMap.get(request);
    },
  };
}
