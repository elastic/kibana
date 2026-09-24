/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'child_process';
import Path from 'path';

const HOOK = Path.join(__dirname, 'scout_hook.sh');
const CERT = '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----';

const runHook = (config: unknown, env: Record<string, string> = {}) => {
  const baseEnv = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('SANDBOX_'))
  );
  const result = spawnSync('bash', [HOOK], {
    input: typeof config === 'string' ? config : JSON.stringify(config),
    env: { ...baseEnv, ...env },
    encoding: 'utf8',
  });
  return {
    status: result.status,
    stderr: result.stderr,
    output: result.status === 0 ? JSON.parse(result.stdout) : undefined,
  };
};

const SANDBOX = {
  host: 'sandbox.example.com',
  port: 9443,
  apiKey: 'key',
  ssl: { certificate: CERT, key: 'KEY', certificateAuthorities: 'CA' },
};

describe('nightshift-investigations scout hook', () => {
  it('adds nothing without sandbox credentials, so Scout starts plain evals_tracing', () => {
    expect(runHook({})).toEqual({ status: 0, stderr: '', output: {} });
    expect(runHook('')).toEqual({ status: 0, stderr: '', output: {} });
  });

  it('maps the sandbox block to SANDBOX_* and points the config set at kibana.sandbox.yml', () => {
    const { output } = runHook({ sandbox: SANDBOX });
    expect(output).toEqual({
      env: {
        SANDBOX_API_HOST: 'sandbox.example.com',
        SANDBOX_API_PORT: '9443',
        SANDBOX_API_KEY: 'key',
        SANDBOX_CLIENT_CERT: CERT,
        SANDBOX_CLIENT_KEY: 'KEY',
        SANDBOX_CA_CERT: 'CA',
        SANDBOX_KIBANA_CONFIG: Path.join(__dirname, 'kibana.sandbox.yml'),
      },
    });
  });

  it('exports an empty CA when the sandbox has no private CA, since kibana.sandbox.yml needs it', () => {
    const { ssl, ...rest } = SANDBOX;
    const { output } = runHook({ sandbox: { ...rest, ssl: { certificate: CERT, key: 'KEY' } } });
    expect(output.env.SANDBOX_CA_CERT).toBe('');
  });

  it('leaves host and port unset so kibana.sandbox.yml defaults them', () => {
    const { host, port, ...rest } = SANDBOX;
    const { output } = runHook({ sandbox: rest });
    expect(output.env).not.toHaveProperty('SANDBOX_API_HOST');
    expect(output.env).not.toHaveProperty('SANDBOX_API_PORT');
  });

  it('falls back to SANDBOX_* exported in the shell, with the config taking precedence', () => {
    const shell = {
      SANDBOX_API_KEY: 'shell-key',
      SANDBOX_CLIENT_CERT: 'C',
      SANDBOX_CLIENT_KEY: 'K',
    };
    expect(runHook({}, shell).output.env).toMatchObject(shell);
    expect(runHook({ sandbox: SANDBOX }, shell).output.env.SANDBOX_API_KEY).toBe('key');
  });

  it('treats REPLACE_ME placeholders as unset', () => {
    expect(runHook({ sandbox: { apiKey: 'REPLACE_ME', host: 'REPLACE_ME' } }).output).toEqual({});
  });

  it('rejects sandbox settings without an API key instead of silently running only smoke', () => {
    const { status, stderr } = runHook({ sandbox: { host: 'sandbox.example.com' } });
    expect(status).toBe(1);
    expect(stderr).toContain('sandbox host set without an API key');
  });

  it('requires the mTLS certificate and key alongside the API key', () => {
    const { status, stderr } = runHook({ sandbox: { apiKey: 'key' } });
    expect(status).toBe(1);
    expect(stderr).toContain('sandbox-api mTLS needs');
  });

  it('rejects input that is not a JSON object', () => {
    expect(runHook('not json').status).toBe(1);
  });
});
