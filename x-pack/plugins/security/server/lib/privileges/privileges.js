/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getVersionAction(kibanaVersion) {
  return `version:${kibanaVersion}`;
}

export function getLoginAction() {
  return `action:login`;
}

export function buildPrivilegeMap(savedObjectTypes, application, kibanaVersion) {
  const readSavedObjectsActions = buildSavedObjectsReadActions(savedObjectTypes);

  return {
    all: {
      application,
      name: 'all',
      actions: [getVersionAction(kibanaVersion), 'action:*'],
      metadata: {}
    },
    read: {
      application,
      name: 'read',
      actions: [getVersionAction(kibanaVersion), getLoginAction(), ...readSavedObjectsActions],
      metadata: {}
    }
  };
}

function buildSavedObjectsReadActions(savedObjectTypes) {
  const readActions = ['get', 'bulk_get', 'find'];
  return buildSavedObjectsActions(savedObjectTypes, readActions);
}

function buildSavedObjectsActions(savedObjectTypes, actions) {
  return savedObjectTypes
    .map(type => actions.map(action => `action:saved_objects/${type}/${action}`))
    .reduce((acc, types) => [...acc, ...types], []);
}
