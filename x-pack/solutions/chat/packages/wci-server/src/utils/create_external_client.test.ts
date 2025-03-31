/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { getClientForExternalServer } from './create_external_client';

jest.mock('@modelcontextprotocol/sdk/client/index.js');
jest.mock('@modelcontextprotocol/sdk/client/sse.js');

describe('getClientForExternalServer', () => {
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

    const integrationClient = await getClientForExternalServer({
      serverUrl: mockUrl,
      clientName: 'test-client',
    });

    await integrationClient.connect();

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

    const integrationClient = await getClientForExternalServer({
      serverUrl: mockUrl,
    });

    await integrationClient.connect();

    expect(SSEClientTransport).toHaveBeenCalledWith(new URL(mockUrl));
  });

  it('should disconnect properly', async () => {
    const { mockClient } = setupMocks();

    const integrationClient = await getClientForExternalServer({
      serverUrl: mockUrl,
    });

    await integrationClient.connect();
    await integrationClient.disconnect();

    expect(mockClient.close).toHaveBeenCalled();
  });

  it('should throw error when connecting an already connected client', async () => {
    setupMocks();

    const integrationClient = await getClientForExternalServer({
      serverUrl: mockUrl,
    });

    await integrationClient.connect();
    await expect(integrationClient.connect()).rejects.toThrow('Client already connected');
  });

  it('should handle disconnection of an unconnected client gracefully', async () => {
    const integrationClient = await getClientForExternalServer({
      serverUrl: mockUrl,
    });

    await expect(integrationClient.disconnect()).resolves.not.toThrow();
  });
});
