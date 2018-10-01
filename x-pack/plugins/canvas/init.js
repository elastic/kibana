/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionsRegistry } from '@kbn/interpreter/common/lib/functions_registry';
import { pathsRegistry } from '@kbn/interpreter/common/lib/paths_registry';
import { loadServerPlugins } from '@kbn/interpreter/common/lib/load_server_plugins';
import { routes } from './server/routes';
import { commonFunctions } from './common/functions';
import { registerCanvasUsageCollector } from './server/usage';
import { pluginPaths } from './plugin_paths';

export default function(server /*options*/) {
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

  pathsRegistry.registerAll(pluginPaths);
  loadServerPlugins().then(() => routes(server));
  registerCanvasUsageCollector(server);
}
