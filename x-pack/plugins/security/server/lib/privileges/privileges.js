/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getVersionPrivilege(kibanaVersion) {
  // TODO: Remove the .toLowerCase() once the capitalization with app privileges is fixed
  return `version:${kibanaVersion.toLowerCase()}`;
}

export function getLoginPrivilege() {
  return `action:login`;
}

export function buildPrivilegeMap(savedObjectTypes, application, kibanaVersion) {
  const readSavedObjectsPrivileges = buildSavedObjectsReadPrivileges(savedObjectTypes);

  const privilegeActions = {};

  privilegeActions.all = {
    application,
    name: 'all',
    actions: [getVersionPrivilege(kibanaVersion), 'action:*'],
    metadata: {}
  };

  privilegeActions.read = {
    application,
    name: 'read',
    actions: [getVersionPrivilege(kibanaVersion), getLoginPrivilege(), ...readSavedObjectsPrivileges],
    metadata: {}
  };

  return privilegeActions;
}

function buildSavedObjectsReadPrivileges(savedObjectTypes) {
  const readActions = ['get', 'bulk_get', 'find'];
  return buildSavedObjectsPrivileges(savedObjectTypes, readActions);
}

function buildSavedObjectsPrivileges(savedObjectTypes, actions) {
  return savedObjectTypes
    .map(type => actions.map(action => `action:saved_objects/${type}/${action}`))
    .reduce((acc, types) => [...acc, ...types], []);
}
