/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IGNORED_TYPES } from '../../../common/constants';

export function buildPrivilegeMap(savedObjectTypes, actions) {
  const buildSavedObjectsActions = (savedObjectActions) => {
    return savedObjectTypes
      .filter(type => !IGNORED_TYPES.includes(type))
      .map(type => savedObjectActions.map(savedObjectAction => actions.getSavedObjectAction(type, savedObjectAction)))
      .reduce((acc, types) => [...acc, ...types], []);
  };

  // the following list of privileges should only be added to, you can safely remove actions, but not privileges as
  // it's a backwards compatibility issue and we'll have to at least adjust registerPrivilegesWithCluster to support it
  return {
    global: {
      all: [
        actions.version,
        'action:*'
      ],
      read: [
        actions.version,
        actions.login,
        ...buildSavedObjectsActions([
          'get',
          'bulk_get',
          'find'
        ])
      ],
    },
    space: {
      all: [
        actions.version,
        actions.login,
        ...buildSavedObjectsActions([
          'create',
          'bulk_create',
          'delete',
          'get',
          'bulk_get',
          'find',
          'update'
        ])
      ],
      read: [
        actions.version,
        actions.login,
        ...buildSavedObjectsActions([
          'get',
          'bulk_get',
          'find'])
      ],
    },
  };
}
