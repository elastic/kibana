/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { McpClient } from '../mcp';

/**
 * Returns a {@link McpProviderFn} that will run the provided server in memory
 * and connect to it.
 */
export const getConnectToInternalServer = ({
  server,
  clientName = 'unknown',
}: {
  server: McpServer;
  clientName?: string;
}): (() => Promise<McpClient>) => {
  let connected = false;

  return async function connect() {
    if (connected) {
      throw new Error('Client already connected');
    }
    connected = true;

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({
      name: clientName,
      version: '1.0.0',
    });

    await server.connect(clientTransport);
    await client.connect(serverTransport);

    const disconnect = async () => {
      await client.close();
      await server.close();
    };

    return Object.assign(client, {
      disconnect,
    });
  };
};
