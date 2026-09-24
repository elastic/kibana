/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import Path from 'path';

const HOOK = Path.join(__dirname, 'scout_hook.sh');
const CERT = '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----';

const runHook = (config: unknown, env: Record<string, string> = {}) => {
  const baseEnv = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => !name.startsWith('SANDBOX_') && !name.startsWith('NIGHTSHIFT_')
    )
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
        NIGHTSHIFT_CONCURRENCY: '2',
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

  it('reads legacy PEM file paths without overriding profile or shell contents', () => {
    const directory = mkdtempSync(Path.join(tmpdir(), 'scout-hook-pem-'));
    const certificatePath = Path.join(directory, 'client.crt');
    const keyPath = Path.join(directory, 'client.key');
    const caPath = Path.join(directory, 'ca.crt');
    writeFileSync(certificatePath, CERT);
    writeFileSync(keyPath, 'FILE_KEY', { mode: 0o600 });
    writeFileSync(caPath, 'FILE_CA');
    const env = {
      SANDBOX_API_KEY: 'shell-key',
      SANDBOX_CLIENT_CERT_PATH: certificatePath,
      SANDBOX_CLIENT_KEY_PATH: keyPath,
      SANDBOX_CA_CERT_PATH: caPath,
    };
    try {
      expect(runHook({}, env).output.env).toMatchObject({
        SANDBOX_CLIENT_CERT: CERT,
        SANDBOX_CLIENT_KEY: 'FILE_KEY',
        SANDBOX_CA_CERT: 'FILE_CA',
      });
      expect(
        runHook({}, { ...env, SANDBOX_CLIENT_KEY: 'SHELL_KEY' }).output.env.SANDBOX_CLIENT_KEY
      ).toBe('SHELL_KEY');
      expect(runHook({ sandbox: SANDBOX }, env).output.env.SANDBOX_CLIENT_KEY).toBe('KEY');
      expect(runHook({}, { ...env, SANDBOX_CLIENT_KEY_PATH: '/missing/key' }).status).not.toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
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

  it('never passes the API key or private key to jq as command-line arguments', () => {
    // A jq shim records every argv it receives, then defers to the real jq.
    const shimDir = mkdtempSync(Path.join(tmpdir(), 'scout-hook-jq-'));
    const argvLog = Path.join(shimDir, 'argv.log');
    const realJq = spawnSync('bash', ['-c', 'command -v jq'], { encoding: 'utf8' }).stdout.trim();
    writeFileSync(
      Path.join(shimDir, 'jq'),
      `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> "${argvLog}"\nexec "${realJq}" "$@"\n`,
      { mode: 0o755 }
    );
    try {
      const { status } = runHook(
        {
          nightshift: {
            telemetry: { url: 'https://remote.example.com', apiKey: 'SECRET_TELEMETRY_KEY' },
          },
          sandbox: {
            ...SANDBOX,
            apiKey: 'SECRET_API_KEY',
            ssl: { ...SANDBOX.ssl, key: 'SECRET_PEM' },
          },
        },
        { PATH: `${shimDir}:${process.env.PATH}` }
      );
      expect(status).toBe(0);
      const argv = readFileSync(argvLog, 'utf8');
      expect(argv).not.toContain('SECRET_API_KEY');
      expect(argv).not.toContain('SECRET_PEM');
      expect(argv).not.toContain('SECRET_TELEMETRY_KEY');
    } finally {
      rmSync(shimDir, { recursive: true, force: true });
    }
  });
  it.each(['1', '16', '45'])('exports concurrency %s for both Scout and Playwright', (value) => {
    expect(
      runHook({ sandbox: SANDBOX }, { NIGHTSHIFT_CONCURRENCY: value }).output.env
        .NIGHTSHIFT_CONCURRENCY
    ).toBe(value);
  });

  it.each(['0', '46', '1.5', 'invalid', ''])(
    'rejects invalid concurrency %s before starting Scout',
    (value) => {
      const result = runHook({ sandbox: SANDBOX }, { NIGHTSHIFT_CONCURRENCY: value });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('integer between 1 and 45');
    }
  );

  it('keeps dataset selection out of the server fingerprint', () => {
    expect(runHook({ sandbox: SANDBOX }, { NIGHTSHIFT_DATASET_ID: 'first' }).output).toEqual(
      runHook(
        { sandbox: SANDBOX },
        { NIGHTSHIFT_DATASET_ID: 'second', NIGHTSHIFT_DATASETS: 'trace-only' }
      ).output
    );
  });

  it('rejects conflicting dataset sources', () => {
    const result = runHook(
      { sandbox: SANDBOX },
      { NIGHTSHIFT_DATASET_ID: 'stored', NIGHTSHIFT_EXAMPLES_FILE: 'examples.json' }
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Choose either');
  });

  it('exports telemetry from the profile, with shell fallback and an optional index hint', () => {
    const shell = {
      NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL: 'https://shell.example.com',
      NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY: 'shell-key',
    };
    expect(runHook({ sandbox: SANDBOX }, shell).output.env).toMatchObject({
      ...shell,
      NIGHTSHIFT_SANDBOX_READABLE_INDICES: '',
      NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG: Path.join(__dirname, 'kibana.telemetry.yml'),
    });
    expect(
      runHook(
        {
          sandbox: SANDBOX,
          nightshift: {
            telemetry: {
              url: 'https://profile.example.com',
              apiKey: 'profile-key',
              readableIndices: 'remote:logs-*',
            },
          },
        },
        shell
      ).output.env
    ).toMatchObject({
      NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL: 'https://profile.example.com',
      NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY: 'profile-key',
      NIGHTSHIFT_SANDBOX_READABLE_INDICES: 'remote:logs-*',
    });
  });

  it.each([
    { url: 'https://remote.example.com' },
    { apiKey: 'key' },
    { readableIndices: 'logs-*' },
  ])('rejects incomplete telemetry settings %j', (telemetry) => {
    const result = runHook({ sandbox: SANDBOX, nightshift: { telemetry } });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('requires both URL and API key');
  });

  it('requires sandbox credentials when telemetry is configured', () => {
    const result = runHook({
      nightshift: { telemetry: { url: 'https://remote.example.com', apiKey: 'key' } },
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('requires sandbox credentials');
  });
});
