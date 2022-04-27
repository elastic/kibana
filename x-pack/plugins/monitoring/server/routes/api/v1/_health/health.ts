/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleError } from '../../../../lib/errors';
import { LegacyRequest, LegacyServer, MonitoringCore } from '../../../../types';
import { getIndexPatterns } from '../../../../lib/cluster/get_index_patterns';

// Is MonitoringCore the right type?
export function health(server: MonitoringCore) {
  server.route({
    method: 'get',
    path: '/api/monitoring/v1/_health', // Constant in common/http_api
    validate: false, // If we make timeouts configurable we'd need a validation function here
    // Is LegacyRequest the right type? Do I even need it?
    async handler(req: LegacyRequest) {
      try {
        const config = server.config;

        const indexPatterns = getIndexPatterns(server as LegacyServer, {
          filebeatIndexPattern: config.ui.logs.index,
        });

        // Things to inspect:
        // Elasticsearch
        // Kibana
        // Logstash
        // Beats
        // APM server / Fleet (what about Agents?)
        // Enterprise search
        // Config
        // Collection modes

        return {
          config,
          indexPatterns,
        }; // Should be an io-ts type, and be explicit about what is exposed for security reasons
      } catch (err) {
        return handleError(err, req); // Kinda wanna wrap this handler in something that does this for me?
      }
    },
  });
}
