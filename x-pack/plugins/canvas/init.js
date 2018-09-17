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

export default function(server /*options*/) {
  server.injectUiAppVars('canvas', async () => {
    const config = server.config();
    const basePath = config.get('server.basePath');
    const reportingBrowserType = config.get('xpack.reporting.capture.browser.type');

    // used to inject kibana injected vars, which visualize integration needs
    const { regionmapsConfig, mapConfig, tilemapsConfig } = await server.getInjectedUiAppVars(
      'kibana'
    );

    return {
      regionmapsConfig,
      mapConfig,
      tilemapsConfig,
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

  loadServerPlugins().then(() => routes(server));
  registerCanvasUsageCollector(server);
}
