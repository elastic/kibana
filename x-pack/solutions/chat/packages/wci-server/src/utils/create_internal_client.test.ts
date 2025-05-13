/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { getConnectToInternalServer } from './create_internal_client';

jest.mock('@modelcontextprotocol/sdk/inMemory.js');
jest.mock('@modelcontextprotocol/sdk/client/index.js');

describe('getConnectToInternalServer', () => {
  const createStubServer = (): jest.Mocked<McpServer> => {
    return {
      connect: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<McpServer>;
  };

  const createStubTransport = () => ({
    close: jest.fn(),
  });

  const setupMocks = () => {
    const clientTransport = createStubTransport();
    const serverTransport = createStubTransport();
    const mockClient = {
      connect: jest.fn(),
      close: jest.fn(),
    };

    (InMemoryTransport.createLinkedPair as jest.Mock).mockReturnValue([
      clientTransport,
      serverTransport,
    ]);
    (Client as jest.Mock).mockImplementation(() => mockClient);

    return { clientTransport, serverTransport, mockClient };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a client and connect successfully', async () => {
    const server = createStubServer();
    const { clientTransport, serverTransport, mockClient } = setupMocks();

    const connectFn = getConnectToInternalServer({
      server,
      clientName: 'test-client',
    });

    await connectFn();

    expect(Client).toHaveBeenCalledWith({
      name: 'test-client',
      version: '1.0.0',
    });
    expect(server.connect).toHaveBeenCalledWith(clientTransport);
    expect(mockClient.connect).toHaveBeenCalledWith(serverTransport);
  });

  it('should disconnect properly', async () => {
    const server = createStubServer();
    const { mockClient } = setupMocks();

    const connectFn = getConnectToInternalServer({
      server,
    });

    const client = await connectFn();
    await client.disconnect();

    expect(mockClient.close).toHaveBeenCalled();
    expect(server.close).toHaveBeenCalled();
  });

  it('should throw error when connecting an already connected client', async () => {
    const server = createStubServer();
    setupMocks();

    const connectFn = getConnectToInternalServer({
      server,
    });

    await connectFn();
    await expect(connectFn()).rejects.toThrow('Client already connected');
  });

  it('should handle disconnection errors gracefully', async () => {
    const server = createStubServer();
    const { mockClient } = setupMocks();
    mockClient.close.mockRejectedValueOnce(new Error('Disconnect failed'));

    const connectFn = getConnectToInternalServer({
      server,
    });

    const client = await connectFn();
    await expect(client.disconnect()).rejects.toThrow('Disconnect failed');
  });
});
