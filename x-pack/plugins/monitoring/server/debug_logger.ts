/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import fs from 'fs';
import { MonitoringConfig } from './config';
import { RouteDependencies } from './types';

export function decorateDebugServer(
  _server: any,
  config: MonitoringConfig,
  logger: RouteDependencies['logger']
) {
  // bail if the proper config value is not set (extra protection)
  if (!config.ui.debug_mode) {
    return _server;
  }

  // create a debug logger that will either write to file (if debug_log_path exists) or log out via logger
  const debugLog = createDebugLogger({ path: config.ui.debug_log_path, logger });

  return {
    // maintain the rest of _server untouched
    ..._server,
    // TODO: replace any
    route: (options: any) => {
      const apiPath = options.path;
      return _server.route({
        ...options,
        // TODO: replace any
        handler: async (req: any) => {
          const { elasticsearch: cached } = req.server.plugins;
          const apiRequestHeaders = req.headers;
          req.server.plugins.elasticsearch = {
            ...req.server.plugins.elasticsearch,
            getCluster: (name: string) => {
              const cluster = cached.getCluster(name);
              return {
                ...cluster,
                // TODO: better types?
                callWithRequest: async (_req: typeof req, type: string, params: any) => {
                  const result = await cluster.callWithRequest(_req, type, params);

                  // log everything about this request -> query -> result
                  debugLog({
                    api_path: apiPath,
                    referer_url: apiRequestHeaders.referer,
                    query: {
                      params,
                      result,
                    },
                  });

                  return result;
                },
              };
            },
          };
          return options.handler(req);
        },
      });
    },
  };
}

function createDebugLogger({
  path,
  logger,
}: {
  path: string;
  logger: RouteDependencies['logger'];
}) {
  if (path.length > 0) {
    const stream = fs.createWriteStream('./stack_monitoring_debug_log.ndjson', { flags: 'a' });
    return function logToFile(line: any) {
      stream.write(JSON.stringify(line));
    };
  } else {
    return function logToStdOut(line: any) {
      logger.info(JSON.stringify(line));
    };
  }
}
