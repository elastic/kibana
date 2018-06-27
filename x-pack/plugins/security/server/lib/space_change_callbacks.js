/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getClient } from '../../../../server/lib/get_client_shield';
import { map, assign } from 'lodash';

export function initSpaceChangeCallbacks(server) {

  const { spaces } = server;

  const { callWithRequest } = getClient(server);

  spaces.registerSpaceChangeHandler('security', onSpaceChange(callWithRequest));
}

function onSpaceChange(callWithRequest) {
  return (operation, space, request) => {
    console.log('onSpaceChange', operation, space);
    if (operation === 'create') {
      return onCreateSpace(callWithRequest, space, request);
    }
  };
}

async function onCreateSpace(callWithRequest, space, request) {
  const allRoles = await callWithRequest(request, 'shield.getRole').then(
    (response) => {
      return map(response, (role, name) => assign(role, { name }));
    }
  );

  const rolesToUpdate = allRoles.map(role => {
    const { applications = [] } = role;
    const kibanaPrivileges = applications.filter(app => app.application === 'kibana' && app.metadata._autoApply);
    if (kibanaPrivileges.length === 0)  {
      return null;
    }

    kibanaPrivileges.forEach(privilege => {
      privilege.resources = [...privilege.resources, space.id];
    });

    return role;
  }).filter(r => !!r);

  rolesToUpdate.forEach(role => {
    console.log('i would update this role', role);
  });
}
