/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { routes } from './server/routes';
import { functionsRegistry } from './common/lib/functions_registry';
import { commonFunctions } from './common/functions';
import { loadServerPlugins } from './server/lib/load_server_plugins';
import { registerCanvasUsageCollector } from './server/usage';
import {
  ecommerceSavedObjects,
  flightsSavedObjects,
  webLogsSavedObjects,
} from './server/sample_data';

export default async function(server /*options*/) {
  server.injectUiAppVars('canvas', () => {
    const config = server.config();
    const basePath = config.get('server.basePath');
    const reportingBrowserType = config.get('xpack.reporting.capture.browser.type');

    return {
      kbnIndex: config.get('kibana.index'),
      esShardTimeout: config.get('elasticsearch.shardTimeout'),
      esApiVersion: config.get('elasticsearch.apiVersion'),
      serverFunctions: functionsRegistry.toArray(),
      basePath,
      reportingBrowserType,
    };
  });

  // There are some common functions that use private APIs, load them here
  commonFunctions.forEach(func => functionsRegistry.register(func));

  await loadServerPlugins();
  routes(server);
  registerCanvasUsageCollector(server);

  const now = new Date();
  const nowTimestamp = now.toISOString();
  function updateCanvasWorkpadTimestamps(savedObjects) {
    return savedObjects.map(savedObject => {
      if (savedObject.type === 'canvas-workpad') {
        savedObject.attributes['@timestamp'] = nowTimestamp;
        savedObject.attributes['@created'] = nowTimestamp;
      }

      return savedObject;
    });
  }

  server.addSavedObjectsToSampleDataset(
    'ecommerce',
    updateCanvasWorkpadTimestamps(ecommerceSavedObjects)
  );
  server.addSavedObjectsToSampleDataset(
    'flights',
    updateCanvasWorkpadTimestamps(flightsSavedObjects)
  );
  server.addSavedObjectsToSampleDataset('logs', updateCanvasWorkpadTimestamps(webLogsSavedObjects));
}
