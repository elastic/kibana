/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export function actionsFactory(config) {
  const kibanaVersion = config.get('pkg.version');

  return {
    getSavedObjectAction(type, action) {
      return `action:saved_objects/${type}/${action}`;
    },
    login: `action:login`,
    version: `version:${kibanaVersion}`,
  };
}
