/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function buildPrivilegeMap(savedObjectTypes, application, actions) {
  const buildSavedObjectsActions = (savedObjectActions) => {
    return savedObjectTypes
      .map(type => savedObjectActions.map(savedObjectAction => actions.getSavedObjectAction(type, savedObjectAction)))
      .reduce((acc, types) => [...acc, ...types], []);
  };

  return {
    all: {
      application,
      name: 'all',
      actions: [actions.version, 'action:*'],
      metadata: {}
    },
    read: {
      application,
      name: 'read',
      actions: [actions.version, actions.login, ...buildSavedObjectsActions(['get', 'bulk_get', 'find'])],
      metadata: {}
    }
  };
}
