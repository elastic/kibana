/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Boom from 'boom';
import { Server } from 'hapi';
import { Logger } from 'vscode-jsonrpc';
import { CodeNodeClient } from '../code_node_client';

export function clusterRoute(server: Server, codeNodeClient: CodeNodeClient, log: Logger) {
  server.securedRoute({
    path: '/api/code/cluster',
    method: 'GET',
    requireAdmin: false,
    async handler() {
      const info = codeNodeClient.getCodeNodeInfo();
      if (info) {
        return info;
      } else {
        throw Boom.notFound('no cluster info found');
      }
    },
  });

  server.securedRoute({
    path: '/api/code/cluster',
    method: 'DELETE',
    requireAdmin: true,
    async handler() {
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
