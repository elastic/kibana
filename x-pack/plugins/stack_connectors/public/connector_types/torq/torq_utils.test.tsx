/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import TorqWebhookEndpoint from './torq_utils';

describe('TorqWebhookEndpoint', () => {
  it('should return undefined for valid Torq webhook URL', () => {
    const validation = TorqWebhookEndpoint('Invalid URL provided');
    const result = validation({ value: 'https://hooks.torq.io' });

    expect(result).toBeUndefined();
  });

  it('should return undefined for valid Torq webhook subdomain URL', () => {
    const validation = TorqWebhookEndpoint('Invalid URL provided');
    const result = validation({ value: 'https://hooks.eu.torq.io' });

    expect(result).toBeUndefined();
  });

  it('should return undefined for invalid Torq webhook hostname', () => {
    const validation = TorqWebhookEndpoint('Invalid URL provided');
    const result = validation({ value: 'https://hooks.eu.west.torq.io' });

    expect(result).toBeUndefined();
  });

  it('should return error for non-Torq URL', () => {
    const validation = TorqWebhookEndpoint('Invalid URL provided');
    const result = validation({ value: 'https://example.com' });

    expect(result).toEqual({
      code: 'ERR_FIELD_FORMAT',
      formatType: 'URL',
      message: 'Invalid URL provided',
    });
  });

  it('should return error for badly ordered hostname', () => {
    const validation = TorqWebhookEndpoint('Invalid URL provided');
    const result = validation({ value: 'https://invalid.hooks.torq.io' });

    expect(result).toEqual({
      code: 'ERR_FIELD_FORMAT',
      formatType: 'URL',
      message: 'Invalid URL provided',
    });
  });

  it('should return error for hook.torq.io', () => {
    const validation = TorqWebhookEndpoint('Invalid URL provided');
    const result = validation({ value: 'https://hook.torq.io' });

    expect(result).toEqual({
      code: 'ERR_FIELD_FORMAT',
      formatType: 'URL',
      message: 'Invalid URL provided',
    });
  });

  it('should return error for an empty URL', () => {
    const validation = TorqWebhookEndpoint('URL cannot be empty');
    const result = validation({ value: '' });

    expect(result).toEqual({
      code: 'ERR_FIELD_FORMAT',
      formatType: 'URL',
      message: 'URL cannot be empty',
    });
  });
});
