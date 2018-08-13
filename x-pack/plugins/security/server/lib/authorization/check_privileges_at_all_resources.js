/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ALL_RESOURCE } from '../../../common/constants';

// this will be changed to use the facility introduced by https://github.com/elastic/elasticsearch/issues/32777
export function checkPrivilegesAtAllResourcesWithRequestFactory(checkPrivilegesWithRequest, elasticsearch, savedObjects, spaces) {
  const adminCluster = elasticsearch.getCluster('admin');
  const { callWithInternalUser } = adminCluster;

  const internalSavedObjectsRepository = savedObjects.getSavedObjectsRepository(callWithInternalUser);

  const getResources = async () => {
    if (!spaces || !spaces.enabled) {
      return [ALL_RESOURCE];
    }

    const { saved_objects: savedObjects } = internalSavedObjectsRepository.find({ type: 'space' });
    return [
      ALL_RESOURCE,
      ...savedObjects.map(space => space.id),
    ];
  };

  return function checkPrivilegesAtAllResourcesWithRequest(request) {
    const checkPrivileges = checkPrivilegesWithRequest(request);

    return async function checkPrivilegesAtAllResources(actions) {
      const resources = await getResources();
      return await checkPrivileges(resources, actions);
    };
  };
}
