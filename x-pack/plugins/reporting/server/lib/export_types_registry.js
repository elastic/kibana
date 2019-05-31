/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import glob from 'glob';
import { ExportTypesRegistry } from '../../common/export_types_registry';
import { oncePerServer } from './once_per_server';

function scan(pattern) {
  return new Promise((resolve, reject) => {
    glob(pattern, {}, (err, files) => {
      if (err) {
        return reject(err);
      }

      resolve(files);
    });
  });
}

const pattern = resolve(__dirname, '../../export_types/*/server/index.[jt]s');
async function exportTypesRegistryFn(server) {
  const exportTypesRegistry = new ExportTypesRegistry();
  const files = await scan(pattern);
  files.forEach(file => {
    server.log(['reporting', 'debug', 'exportTypes'], `Found exportType at ${file}`);

    const { register } = require(file); // eslint-disable-line import/no-dynamic-require
    register(exportTypesRegistry);
  });
  return exportTypesRegistry;
}

export const exportTypesRegistryFactory = oncePerServer(exportTypesRegistryFn);
