/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PackageInputType } from '../..';
import { getVarsFor } from './fleet_policies';

const secretTokenRegex = /^[a-zA-Z0-9]+$/;

describe('getVarsFor', () => {
  it('returns secret_token when package input is not provided', () => {
    const config: PackageInputType = {};

    const { secret_token: secretToken, ...result } = getVarsFor({
      config,
      includeSecretToken: true,
    });
    expect(secretToken?.type).toBe('text');
    expect(secretToken?.value).toBeDefined();
    expect(secretToken?.value).toBeDefined();
    expect(secretTokenRegex.test(secretToken?.value)).toBeTruthy();
    expect(result).toEqual({});
  });

  it('returns the vars object for the keys defined plus secret token', () => {
    const config: PackageInputType = {
      host: 'example.com',
      tls_enabled: true,
      tls_supported_protocols: ['foo', 'bar'],
      tls_certificate_path: '123',
      tls_key_path: '456',
    };

    const { secret_token: secretToken, ...result } = getVarsFor({
      config,
      includeSecretToken: true,
    });
    expect(secretToken?.type).toBe('text');
    expect(secretToken?.value.length).toBe(16);
    expect(secretTokenRegex.test(secretToken?.value)).toBeTruthy();
    expect(result).toEqual({
      host: { type: 'text', value: 'example.com' },
      tls_enabled: { type: 'bool', value: true },
      tls_supported_protocols: { type: 'text', value: ['foo', 'bar'] },
      tls_certificate_path: { type: 'text', value: '123' },
      tls_key_path: { type: 'text', value: '456' },
    });
  });

  it('returns vars without secret_token', () => {
    const config: PackageInputType = {
      host: 'example.com',
      tls_enabled: true,
      tls_supported_protocols: ['foo', 'bar'],
      tls_certificate_path: '123',
      tls_key_path: '456',
    };

    const { secret_token: secretToken, ...result } = getVarsFor({
      config,
      includeSecretToken: false,
    });
    expect(secretToken).toBeUndefined();
    expect(result).toEqual({
      host: { type: 'text', value: 'example.com' },
      tls_enabled: { type: 'bool', value: true },
      tls_supported_protocols: { type: 'text', value: ['foo', 'bar'] },
      tls_certificate_path: { type: 'text', value: '123' },
      tls_key_path: { type: 'text', value: '456' },
    });
  });

  it('returns vars with the telemetry key', () => {
    const config: PackageInputType = {
      host: 'example.com',
      telemetry: true,
      tls_enabled: true,
      tls_supported_protocols: ['foo', 'bar'],
      tls_certificate_path: '123',
      tls_key_path: '456',
    };

    const { secret_token: secretToken, ...result } = getVarsFor({
      config,
      includeSecretToken: false,
    });
    expect(secretToken).toBeUndefined();
    expect(result).toEqual({
      host: { type: 'text', value: 'example.com' },
      telemetry: { type: 'bool', value: true },
      tls_enabled: { type: 'bool', value: true },
      tls_supported_protocols: { type: 'text', value: ['foo', 'bar'] },
      tls_certificate_path: { type: 'text', value: '123' },
      tls_key_path: { type: 'text', value: '456' },
    });
  });
});
