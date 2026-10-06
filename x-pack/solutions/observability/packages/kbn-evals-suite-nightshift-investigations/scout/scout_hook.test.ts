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
import { getConfigFromFiles } from '@kbn/config';

const HOOK = Path.join(__dirname, 'scout_hook.sh');
const PEM_DIR = mkdtempSync(Path.join(tmpdir(), 'scout-hook-pem-'));
const CERT = Path.join(PEM_DIR, 'client.crt');
const KEY = Path.join(PEM_DIR, 'client.key');
const CA = Path.join(PEM_DIR, 'ca.crt');
const SHELL_KEY = Path.join(PEM_DIR, 'shell.key');
writeFileSync(CERT, '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----');
writeFileSync(KEY, 'KEY', { mode: 0o600 });
writeFileSync(SHELL_KEY, 'SHELL_KEY', { mode: 0o600 });
writeFileSync(CA, 'CA');

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

const SANDBOX = { url: 'https://sandbox.example.com:9443', apiKey: 'key' };
const MTLS = {
  SANDBOX_CLIENT_CERT_PATH: CERT,
  SANDBOX_CLIENT_KEY_PATH: KEY,
  SANDBOX_CA_CERT_PATH: CA,
};

describe('nightshift-investigations scout hook', () => {
  afterAll(() => {
    rmSync(PEM_DIR, { recursive: true, force: true });
  });

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
        SANDBOX_CLIENT_CERT_PATH: '',
        SANDBOX_CLIENT_KEY_PATH: '',
        SANDBOX_CA_CERT_PATH: '',
        SANDBOX_KIBANA_CONFIG: Path.join(__dirname, 'kibana.sandbox.yml'),
      },
    });
  });

  it.each([
    ['https://sandbox.example.com', 'sandbox.example.com', '443'],
    ['https://sandbox.example.com/', 'sandbox.example.com', '443'],
    ['http://sandbox.example.com', 'sandbox.example.com', '80'],
    ['sandbox.example.com:9090', 'sandbox.example.com', '9090'],
  ])('splits sandbox.url %s into host and port', (url, host, port) => {
    expect(runHook({ sandbox: { apiKey: 'key', url } }).output.env).toMatchObject({
      SANDBOX_API_HOST: host,
      SANDBOX_API_PORT: port,
    });
  });

  it('rejects a sandbox.url without a host or with a non-numeric port', () => {
    for (const url of ['https://', 'https://sandbox.example.com:abc']) {
      const { status, stderr } = runHook({ sandbox: { apiKey: 'key', url } });
      expect(status).toBe(1);
      expect(stderr).toContain('sandbox.url must look like https://host[:port]');
    }
  });

  it('ignores profile host and port', () => {
    const { output } = runHook({
      sandbox: { apiKey: 'key', host: 'legacy.example.com', port: 9090 },
    });
    expect(output.env).not.toHaveProperty('SANDBOX_API_HOST');
    expect(output.env).not.toHaveProperty('SANDBOX_API_PORT');
  });

  it("prefers the profile's url over a shell SANDBOX_API_URL", () => {
    const shell = { SANDBOX_API_URL: 'https://localhost:9090' };
    expect(runHook({ sandbox: SANDBOX }, shell).output.env).toMatchObject({
      SANDBOX_API_HOST: 'sandbox.example.com',
      SANDBOX_API_PORT: '9443',
    });
    expect(runHook({ sandbox: { apiKey: 'key' } }, shell).output.env).toMatchObject({
      SANDBOX_API_HOST: 'localhost',
      SANDBOX_API_PORT: '9090',
    });
  });

  it('leaves host and port unset so kibana.sandbox.yml defaults them', () => {
    const { output } = runHook({ sandbox: { apiKey: 'key' } });
    expect(output.env).not.toHaveProperty('SANDBOX_API_HOST');
    expect(output.env).not.toHaveProperty('SANDBOX_API_PORT');
  });

  it('reads mTLS file paths from the profile sandbox.ssl block', () => {
    const { output } = runHook({
      sandbox: { ...SANDBOX, ssl: { certificate: CERT, key: KEY, certificateAuthorities: CA } },
    });
    expect(output.env).toMatchObject(MTLS);
  });

  it('ignores PEM contents in an older sandbox.ssl block', () => {
    // Kibana reads certificates from file paths now; configs still carrying PEM contents must not
    // be mistaken for paths, so the shared sandbox runs on the API key alone.
    const { status, output } = runHook({
      sandbox: {
        ...SANDBOX,
        ssl: {
          certificate: '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----',
          key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----',
        },
      },
    });
    expect(status).toBe(0);
    expect(output.env).toMatchObject({
      SANDBOX_CLIENT_CERT_PATH: '',
      SANDBOX_CLIENT_KEY_PATH: '',
      SANDBOX_CA_CERT_PATH: '',
    });
  });

  it('reads optional mTLS file paths from the shell', () => {
    expect(runHook({ sandbox: SANDBOX }, MTLS).output.env).toMatchObject(MTLS);
  });

  it('exports an empty CA when the sandbox has no private CA, since kibana.sandbox.yml needs it', () => {
    const { SANDBOX_CA_CERT_PATH, ...mtls } = MTLS;
    expect(runHook({ sandbox: SANDBOX }, mtls).output.env.SANDBOX_CA_CERT_PATH).toBe('');
  });

  it('falls back to SANDBOX_* exported in the shell, with the config taking precedence', () => {
    const shell = {
      SANDBOX_API_KEY: 'shell-key',
      SANDBOX_CLIENT_CERT_PATH: CERT,
      SANDBOX_CLIENT_KEY_PATH: SHELL_KEY,
    };
    expect(runHook({}, shell).output.env).toMatchObject(shell);
    expect(runHook({ sandbox: SANDBOX }, shell).output.env).toMatchObject({
      SANDBOX_API_KEY: 'key',
      SANDBOX_CLIENT_KEY_PATH: SHELL_KEY,
    });
  });

  it('rejects PEM file paths that cannot be read', () => {
    const { status, stderr } = runHook(
      { sandbox: SANDBOX },
      { ...MTLS, SANDBOX_CLIENT_KEY_PATH: '/missing/key' }
    );
    expect(status).toBe(1);
    expect(stderr).toContain('cannot read sandbox PEM file /missing/key');
    expect(runHook({ sandbox: SANDBOX }, { ...MTLS, SANDBOX_CA_CERT_PATH: '/no/ca' }).status).toBe(
      1
    );
  });

  it('treats REPLACE_ME placeholders as unset', () => {
    expect(runHook({ sandbox: { apiKey: 'REPLACE_ME', url: 'REPLACE_ME' } }).output).toEqual({});
  });

  it('rejects sandbox settings without an API key instead of silently running only smoke', () => {
    const { status, stderr } = runHook({ sandbox: { url: 'https://sandbox.example.com' } });
    expect(status).toBe(1);
    expect(stderr).toContain('sandbox host port set without an API key');
  });

  it('exports empty PEM paths without a client certificate, so Kibana uses the API key only', () => {
    const { output } = runHook({ sandbox: { apiKey: 'key' } });
    expect(output.env).toMatchObject({
      SANDBOX_API_KEY: 'key',
      SANDBOX_CLIENT_CERT_PATH: '',
      SANDBOX_CLIENT_KEY_PATH: '',
      SANDBOX_CA_CERT_PATH: '',
    });
  });

  it('requires the client certificate and key as a pair', () => {
    const { status, stderr } = runHook(
      { sandbox: { apiKey: 'key' } },
      { SANDBOX_CLIENT_CERT_PATH: CERT }
    );
    expect(status).toBe(1);
    expect(stderr).toContain('set both sandbox.ssl.certificate and sandbox.ssl.key');
    expect(runHook({ sandbox: { apiKey: 'key' } }, { SANDBOX_CLIENT_KEY_PATH: KEY }).status).toBe(
      1
    );
  });

  it('rejects input that is not a JSON object', () => {
    expect(runHook('not json').status).toBe(1);
  });

  it('never passes the API keys to jq as command-line arguments', () => {
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
          sandbox: { ...SANDBOX, apiKey: 'SECRET_API_KEY' },
        },
        { PATH: `${shimDir}:${process.env.PATH}` }
      );
      expect(status).toBe(0);
      const argv = readFileSync(argvLog, 'utf8');
      expect(argv).not.toContain('SECRET_API_KEY');
      expect(argv).not.toContain('SECRET_TELEMETRY_KEY');
    } finally {
      rmSync(shimDir, { recursive: true, force: true });
    }
  });
  it('keeps dataset selection out of the server fingerprint', () => {
    expect(runHook({ sandbox: SANDBOX }, { NIGHTSHIFT_DATASET_NAME: 'first' }).output).toEqual(
      runHook(
        { sandbox: SANDBOX },
        { NIGHTSHIFT_DATASET_NAME: 'second', NIGHTSHIFT_DATASETS: 'trace-only' }
      ).output
    );
  });

  it('leaves dataset validation to Playwright, including smoke-only startup', () => {
    const result = runHook(
      {},
      { NIGHTSHIFT_DATASET_NAME: 'stored', NIGHTSHIFT_EXAMPLES_FILE: 'examples.json' }
    );
    expect(result.status).toBe(0);
    expect(result.output).toEqual({});
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

  describe('telemetry targets', () => {
    const TELEMETRY = {
      url: 'https://remote.example.com',
      apiKey: 'remote-key',
      readableIndices: 'remote:logs-*',
    };
    const PROFILE = { sandbox: SANDBOX, nightshift: { telemetry: TELEMETRY } };

    it('resolves a profile block to the same env as before, which feeds the one connector', () => {
      const { output } = runHook(PROFILE);
      expect(output).toEqual({
        env: {
          ...runHook({ sandbox: SANDBOX }).output.env,
          NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL: 'https://remote.example.com',
          NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY: 'remote-key',
          NIGHTSHIFT_SANDBOX_READABLE_INDICES: 'remote:logs-*',
          NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG: Path.join(__dirname, 'kibana.telemetry.yml'),
        },
      });

      const originalEnv = process.env;
      process.env = { ...originalEnv, ...output.env };
      try {
        const { xpack } = getConfigFromFiles([
          output.env.SANDBOX_KIBANA_CONFIG,
          output.env.NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG,
        ]);
        expect(xpack.actions.preconfigured['nightshift-evals-telemetry']).toMatchObject({
          config: { url: 'https://remote.example.com' },
          secrets: { secretHeaders: { Authorization: 'ApiKey remote-key' } },
        });
        expect(xpack.nightshift_investigations.sandbox).toEqual({
          telemetry_connector_id: 'nightshift-evals-telemetry',
          telemetry_readable_indices: 'remote:logs-*',
        });
      } finally {
        process.env = originalEnv;
      }
    });

    it('ignores profile telemetry for the explicit none target, so smoke needs no credentials', () => {
      const noneTarget = { NIGHTSHIFT_TELEMETRY_TARGET: 'none' };
      expect(runHook({ nightshift: { telemetry: TELEMETRY } }, noneTarget).output).toEqual({});
      expect(runHook(PROFILE, noneTarget).output).toEqual(runHook({ sandbox: SANDBOX }).output);
    });

    it('changes the Scout fingerprint when the target or its settings change', () => {
      // The evals CLI restarts a reused Scout whenever the hook's env output changes.
      const inferred = runHook(PROFILE).output;
      const rotated = {
        sandbox: SANDBOX,
        nightshift: { telemetry: { ...TELEMETRY, apiKey: 'new' } },
      };
      expect(runHook(PROFILE, { NIGHTSHIFT_TELEMETRY_TARGET: 'profile' }).output).toEqual(inferred);
      expect(runHook(PROFILE, { NIGHTSHIFT_TELEMETRY_TARGET: 'none' }).output).not.toEqual(
        inferred
      );
      expect(runHook(rotated).output).not.toEqual(inferred);
    });

    it.each([
      [{ url: 'https://profile.example.com' }, { NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY: 'k' }],
      [
        { apiKey: 'profile-key' },
        { NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL: 'https://shell.example.com' },
      ],
      [{}, { NIGHTSHIFT_TELEMETRY_TARGET: 'profile' }],
    ])(
      'rejects profile telemetry %j with env %j: URL and key need one source',
      (telemetry, env) => {
        const { status, stderr } = runHook({ sandbox: SANDBOX, nightshift: { telemetry } }, env);
        expect(status).toBe(1);
        expect(stderr).toContain('requires both URL and API key from one source');
      }
    );

    it.each(['scout', 'c0', 'PROFILE'])('rejects the unknown telemetry target %s', (target) => {
      const { status, stderr } = runHook({}, { NIGHTSHIFT_TELEMETRY_TARGET: target });
      expect(status).toBe(1);
      expect(stderr).toContain(
        `NIGHTSHIFT_TELEMETRY_TARGET must be none or profile, got "${target}"`
      );
    });

    it('rejects a telemetry URL with embedded credentials without echoing them', () => {
      const url = 'https://elastic:SECRET_PASSWORD@telemetry.example.com';
      const { status, stderr } = runHook({
        sandbox: SANDBOX,
        nightshift: { telemetry: { ...TELEMETRY, url } },
      });
      expect(status).toBe(1);
      expect(stderr).toContain('telemetry URL must not embed credentials');
      expect(stderr).not.toContain('SECRET_PASSWORD');
    });
  });
});
