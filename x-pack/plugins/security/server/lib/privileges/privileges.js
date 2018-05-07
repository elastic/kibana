/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */

export function buildPrivilegeMap(application, kibanaVersion) {
  const readSavedObjectsPrivileges = buildSavedObjectsReadPrivileges('');

  const commonMetadata = {
    kibanaVersion
  };

  function getActionName(...nameParts) {
    return nameParts.join('/');
  }

  const privilegeActionMap = [];

  privilegeActionMap.push({
    application,
    name: 'all',
    actions: [getActionName('*')],
    metadata: {
      ...commonMetadata,
      displayName: 'all'
    }
  });

  privilegeActionMap.push({
    application,
    name: 'read',
    actions: [...readSavedObjectsPrivileges],
    metadata: {
      ...commonMetadata,
      displayName: 'read'
    }
  });

  return privilegeActionMap;
}

function buildSavedObjectsReadPrivileges(prefix) {
  const readActions = ['get', 'mget', 'search'];
  return buildSavedObjectsPrivileges(prefix, readActions);
}

function buildSavedObjectsPrivileges(prefix, actions) {
  const objectTypes = ['dashboard', 'visualization', 'search'];
  return objectTypes
    .map(type => actions.map(action => `${prefix}/${type}/${action}`))
    .reduce((acc, types) => [...acc, ...types], []);
}
