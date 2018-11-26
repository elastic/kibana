/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import _ from 'lodash';
import { Server } from 'src/server/kbn_server';

import { getReindexTemplate } from '../lib/reindex_console_template';

export function registerReindexTemplateRoutes(server: Server) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');

  server.route({
    path: '/api/upgrade_checkup/reindex/console_template/{indexName}.json',
    method: 'GET',
    async handler(request) {
      try {
        const { indexName } = request.params;
        return await getReindexTemplate(callWithRequest, request, indexName);
      } catch (e) {
        return Boom.boomify(e, { statusCode: 500 });
      }
    },
  });
}
