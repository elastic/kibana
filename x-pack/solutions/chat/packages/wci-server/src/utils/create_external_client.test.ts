/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { getConnectToExternalServer } from './create_external_client';

jest.mock('@modelcontextprotocol/sdk/client/index.js');
jest.mock('@modelcontextprotocol/sdk/client/sse.js');

describe('getConnectToExternalServer', () => {
  const mockUrl = 'http://test-server.com/mcp';

  const setupMocks = () => {
    const mockTransport = {
      close: jest.fn(),
    };

    const mockClient = {
      connect: jest.fn(),
      close: jest.fn(),
    };

    (SSEClientTransport as jest.Mock).mockImplementation(() => mockTransport);
    (Client as jest.Mock).mockImplementation(() => mockClient);

    return { mockTransport, mockClient };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a client and connect successfully', async () => {
    const { mockTransport, mockClient } = setupMocks();

    const connectFn = getConnectToExternalServer({
      serverUrl: mockUrl,
      clientName: 'test-client',
    });

    await connectFn();

    expect(SSEClientTransport).toHaveBeenCalledWith(expect.any(URL));
    expect(Client).toHaveBeenCalledWith(
      {
        name: 'test-client',
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
    expect(mockClient.connect).toHaveBeenCalledWith(mockTransport);
  });

  it('should use correct URL when creating transport', async () => {
    setupMocks();

    const connectFn = getConnectToExternalServer({
      serverUrl: mockUrl,
    });

    await connectFn();

    expect(SSEClientTransport).toHaveBeenCalledWith(new URL(mockUrl));
  });

  it('should disconnect properly', async () => {
    const { mockClient } = setupMocks();

    const connectFn = getConnectToExternalServer({
      serverUrl: mockUrl,
    });

    const client = await connectFn();
    await client.disconnect();

    expect(mockClient.close).toHaveBeenCalled();
  });

  it('should throw error when connecting an already connected client', async () => {
    setupMocks();

    const connectFn = getConnectToExternalServer({
      serverUrl: mockUrl,
    });

    await connectFn();
    await expect(connectFn()).rejects.toThrow('Client already connected');
  });

  it('should handle disconnection errors gracefully', async () => {
    const { mockClient } = setupMocks();
    mockClient.close.mockRejectedValueOnce(new Error('Disconnect failed'));

    const connectFn = getConnectToExternalServer({
      serverUrl: mockUrl,
    });

    const client = await connectFn();
    await expect(client.disconnect()).rejects.toThrow('Disconnect failed');
  });
});
