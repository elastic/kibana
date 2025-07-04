/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { McpClient } from '../mcp';

export const getConnectToExternalServer = ({
  serverUrl,
  clientName = 'unknown',
}: {
  serverUrl: string;
  clientName?: string;
}): (() => Promise<McpClient>) => {
  let connected = false;

  return async function connect() {
    if (connected) {
      throw new Error('Client already connected');
    }
    connected = true;

    const transport = new SSEClientTransport(new URL(serverUrl));

    const client = new Client(
      {
        name: clientName,
        version: '1.0.0',
      },
      {
        capabilities: {
          prompts: {},
          resources: {},
          tools: {},
        },
      }
    );

    await client.connect(transport);

    const disconnect = async () => {
      await client.close();
    };

    return Object.assign(client, {
      disconnect,
    });
  };
};
