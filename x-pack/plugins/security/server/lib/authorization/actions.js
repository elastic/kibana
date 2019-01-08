/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isString } from 'lodash';

export function actionsFactory(config) {
  const kibanaVersion = config.get('pkg.version');

  return {
    getSavedObjectAction(type, action) {
      if (!type || !isString(type)) {
        throw new Error('type is required and must be a string');
      }

      if (!action || !isString(action)) {
        throw new Error('action is required and must be a string');
      }

      return `action:saved_objects/${type}/${action}`;
    },
    login: `action:login`,
    version: `version:${kibanaVersion}`,
    manageSpaces: 'action:manage_spaces/*',
  };
}
