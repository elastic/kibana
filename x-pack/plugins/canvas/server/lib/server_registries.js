/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { typesRegistry } from '../../common/lib/types_registry';
import { functionsRegistry as serverFunctions } from '../../common/lib/functions_registry';
import { getPluginPaths } from './get_plugin_paths';

const registries = {
  serverFunctions: serverFunctions,
  commonFunctions: serverFunctions,
  types: typesRegistry,
};

let resolve = null;
const populatePromise = new Promise(_resolve => {
  resolve = _resolve;
});

export const getServerRegistries = () => {
  return populatePromise;
};

export const populateServerRegistries = types => {
  if (!types || !types.length) throw new Error('types is required');

  const remainingTypes = types;
  const populatedTypes = {};

  const loadType = () => {
    const type = remainingTypes.pop();
    getPluginPaths(type).then(paths => {
      global.canvas = global.canvas || {};
      global.canvas.register = d => registries[type].register(d);

      paths.forEach(path => {
        require(path);
      });

      global.canvas = undefined;
      populatedTypes[type] = registries[type];
      if (remainingTypes.length) loadType();
      else resolve(populatedTypes);
    });
  };

  if (remainingTypes.length) loadType();
  return populatePromise;
};
