/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { typesRegistry } from '@kbn/interpreter/common/lib/types_registry';
import { functionsRegistry as serverFunctions } from '@kbn/interpreter/common/lib/functions_registry';
import { getPluginPaths } from './get_plugin_paths';

const types = {
  serverFunctions: serverFunctions,
  commonFunctions: serverFunctions,
  types: typesRegistry,
};

const loaded = new Promise(resolve => {
  const remainingTypes = Object.keys(types);

  const loadType = () => {
    const type = remainingTypes.pop();
    getPluginPaths(type).then(paths => {
      global.canvas = global.canvas || {};
      global.canvas.register = d => types[type].register(d);

      paths.forEach(path => {
        require(path);
      });

      global.canvas = undefined;
      if (remainingTypes.length) loadType();
      else resolve(true);
    });
  };

  loadType();
});

export const loadServerPlugins = () => loaded;
