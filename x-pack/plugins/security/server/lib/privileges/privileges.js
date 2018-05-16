/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */

export function getVersionPrivilege(kibanaVersion) {
  return `version:${kibanaVersion}`;
}

export function getLoginPrivilege() {
  return `action:login`;
}

export function buildPrivilegeMap(application, kibanaVersion) {
  const readSavedObjectsPrivileges = buildSavedObjectsReadPrivileges();

  const privilegeActions = {};

  privilegeActions.all = {
    application,
    name: 'all',
    actions: [getVersionPrivilege(kibanaVersion), getLoginPrivilege(), 'action:*'],
    metadata: {}
  };

  privilegeActions.read = {
    application,
    name: 'read',
    actions: [getVersionPrivilege(kibanaVersion), getLoginPrivilege(), ...readSavedObjectsPrivileges],
    metadata: {}
  };

  return {
    [application]: privilegeActions
  };
}

function buildSavedObjectsReadPrivileges() {
  const readActions = ['get', 'mget', 'search'];
  return buildSavedObjectsPrivileges(readActions);
}

function buildSavedObjectsPrivileges(actions) {
  const objectTypes = ['config', 'dashboard', 'index-pattern', 'search', 'visualization', 'graph-workspace'];
  return objectTypes
    .map(type => actions.map(action => `action:saved-objects/${type}/${action}`))
    .reduce((acc, types) => [...acc, ...types], []);
}
