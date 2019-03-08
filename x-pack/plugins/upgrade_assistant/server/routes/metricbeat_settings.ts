/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Legacy } from 'kibana';
import _ from 'lodash';

import { EsVersionPrecheck } from '../lib/es_version_precheck';
import { fixMetricbeatIndex, isMetricbeatIndex } from '../lib/metricbeat_default_field';

/**
 * Adds routes for detecting and fixing 6.x Metricbeat indices that need the
 * `index.query.default_field` index setting added.
 *
 * @param server
 */
export function registerMetricbeatSettingsRoutes(server: Legacy.Server) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');

  server.route({
    path: '/api/upgrade_assistant/metricbeat/{indexName}',
    method: 'GET',
    options: {
      pre: [EsVersionPrecheck],
    },
    async handler(request) {
      try {
        const { indexName } = request.params;
        return await isMetricbeatIndex(callWithRequest, request, indexName);
      } catch (e) {
        if (e.status === 403) {
          return Boom.forbidden(e.message);
        }

        return Boom.boomify(e, {
          statusCode: 500,
        });
      }
    },
  });

  server.route({
    path: '/api/upgrade_assistant/metricbeat/{indexName}/fix',
    method: 'POST',
    options: {
      pre: [EsVersionPrecheck],
    },
    async handler(request) {
      try {
        const { indexName } = request.params;
        return await fixMetricbeatIndex(callWithRequest, request, indexName);
      } catch (e) {
        if (e.status === 403) {
          return Boom.forbidden(e.message);
        }

        return Boom.boomify(e, {
          statusCode: 500,
        });
      }
    },
  });
}
