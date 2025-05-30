/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ItemType, buildUrl } from './build_url';

describe('buildUrl', () => {
  it('should return a full URL when all fields are provided', () => {
    const item = {
      url: {
        scheme: 'ftp',
        path: '/some/path',
      },
      server: {
        address: 'example.com',
        port: 443,
      },
    };
    const result = buildUrl(item);
    expect(result).toBe('ftp://example.com:443/some/path');
  });

  it('should return a URL without a port if the port is not provided', () => {
    const item = {
      url: {
        scheme: 'http',
        path: '/another/path',
      },
      server: {
        address: 'example.org',
      },
    };
    const result = buildUrl(item);
    expect(result).toBe('http://example.org/another/path');
  });

  it('should return a URL without a path if the path is not provided', () => {
    const item = {
      url: {
        scheme: 'https',
      },
      server: {
        address: 'example.net',
        port: 8443,
      },
    };
    const result = buildUrl(item);
    expect(result).toBe('https://example.net:8443/');
  });

  it('should return undefined if the scheme is missing', () => {
    const item = {
      url: {
        path: '/missing/scheme',
      },
      server: {
        address: 'example.com',
        port: 8080,
      },
    };
    const result = buildUrl(item);
    expect(result).toBeUndefined();
  });

  it('should return undefined if the server address is missing', () => {
    const item = {
      url: {
        scheme: 'https',
        path: '/missing/address',
      },
      server: {
        port: 8080,
      },
    };
    const result = buildUrl(item);
    expect(result).toBeUndefined();
  });

  it('should return undefined and log an error if the port is invalid', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const item = {
      url: {
        scheme: 'https',
        path: '/invalid/port',
      },
      server: {
        address: 'example.com',
        port: 'invalid', // Invalid port
      },
    };

    const result = buildUrl(item as unknown as ItemType);

    expect(result).toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to build URL',
      expect.objectContaining({
        message: 'Invalid base URL: https://example.com:invalid',
      })
    );

    consoleErrorSpy.mockRestore();
  });

  it('should handle an empty object gracefully', () => {
    const item = {};
    const result = buildUrl(item);
    expect(result).toBeUndefined();
  });
});
