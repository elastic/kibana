/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigType } from '../../..';
import { getVarsFor } from './get_fleet_policy_step';

describe('getVarsFor', () => {
  it('returns the vars object for the keys defined plus secret token', () => {
    const config: ConfigType = {
      host: 'example.com',
      tls_enabled: true,
      tls_supported_protocols: ['foo', 'bar'],
      tls_certificate_path: '123',
      tls_key_path: '456',
    };

    const { secret_token: secretToken, ...result } = getVarsFor(config);
    expect(secretToken?.type).toBe('text');
    expect(secretToken?.value.length).toBe(16);
    expect(result).toEqual({
      host: { type: 'text', value: 'example.com' },
      tls_enabled: { type: 'bool', value: true },
      tls_supported_protocols: { type: 'text', value: ['foo', 'bar'] },
      tls_certificate_path: { type: 'text', value: '123' },
      tls_key_path: { type: 'text', value: '456' },
    });
  });

  it('discards secret_token defined and generate a new one', () => {
    const config: ConfigType = {
      host: 'example.com',
      tls_enabled: true,
      tls_supported_protocols: ['foo', 'bar'],
      tls_certificate_path: '123',
      tls_key_path: '456',
      secret_token: 'bar',
    };

    const { secret_token: secretToken, ...result } = getVarsFor(config);
    expect(secretToken?.type).toBe('text');
    expect(secretToken?.value).not.toBe('bar');
    expect(secretToken?.value.length).toBe(16);
    expect(result).toEqual({
      host: { type: 'text', value: 'example.com' },
      tls_enabled: { type: 'bool', value: true },
      tls_supported_protocols: { type: 'text', value: ['foo', 'bar'] },
      tls_certificate_path: { type: 'text', value: '123' },
      tls_key_path: { type: 'text', value: '456' },
    });
  });
});
