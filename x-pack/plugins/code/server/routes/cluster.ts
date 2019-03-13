/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Boom from 'boom';
import { Server } from 'hapi';
import { clientWithRequest } from '../code_node_client';

export function clusterRoute(server: Server) {
  server.route({
    path: '/api/code/cluster',
    method: 'GET',
    async handler(req: any) {
      const codeNodeClient = clientWithRequest(req);
      const info = codeNodeClient.getCodeNodeInfo();
      if (info) {
        return info;
      } else {
        throw Boom.notFound('no cluster info found');
      }
    },
  });

  server.route({
    path: '/api/code/cluster',
    method: 'DELETE',
    async handler(req: any) {
      const codeNodeClient = clientWithRequest(req);
      const info = codeNodeClient.getCodeNodeInfo();
      if (info) {
        await codeNodeClient.deleteNodeInfo();
        return info;
      } else {
        throw Boom.notFound('no cluster info found');
      }
    },
  });
}
