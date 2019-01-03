/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { routes } from './server/routes';
import { commonFunctions } from './common/functions';
import { registerCanvasUsageCollector } from './server/usage';
import { loadSampleData } from './server/sample_data';

export default async function(server /*options*/) {
  const functionsRegistry = server.plugins.interpreter.serverFunctions;

  server.injectUiAppVars('canvas', async () => {
    const config = server.config();
    const basePath = config.get('server.basePath');
    const reportingBrowserType = (() => {
      const configKey = 'xpack.reporting.capture.browser.type';
      if (!config.has(configKey)) {
        return null;
      }
      return config.get(configKey);
    })();
    const kibanaVars = await server.getInjectedUiAppVars('kibana');

    return {
      ...kibanaVars,
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

  registerCanvasUsageCollector(server);
  loadSampleData(server);
  routes(server);
}
