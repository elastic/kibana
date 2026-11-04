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
      ([name]) =>
        !name.startsWith('SANDBOX_') &&
        !name.startsWith('NIGHTSHIFT_') &&
        !name.startsWith('EVAL_SHARD_') &&
        name !== 'KBN_EVALS_CONFIG_B64'
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

  describe('telemetry configuration', () => {
    const TELEMETRY = {
      url: 'https://remote.example.com',
      apiKey: 'remote-key',
      readableIndices: 'remote:logs-*',
    };
    const PROFILE = { sandbox: SANDBOX, nightshift: { telemetry: TELEMETRY } };

    it('resolves a profile block through the connector and manifest configuration', () => {
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

    it.each([
      { url: 'https://other.example.com' },
      { apiKey: 'rotated-key' },
      { readableIndices: 'remote:metrics-*' },
    ])('changes the Scout fingerprint when telemetry settings change: %j', (settings) => {
      // The evals CLI restarts a reused Scout whenever the hook's env output changes.
      const configured = runHook(PROFILE).output;
      expect(
        runHook({ sandbox: SANDBOX, nightshift: { telemetry: { ...TELEMETRY, ...settings } } })
          .output
      ).not.toEqual(configured);
      expect(runHook({ sandbox: SANDBOX }).output).not.toEqual(configured);
    });

    it.each([
      [{ url: 'https://profile.example.com' }, { NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY: 'k' }],
      [
        { apiKey: 'profile-key' },
        { NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL: 'https://shell.example.com' },
      ],
    ])(
      'rejects profile telemetry %j with env %j: URL and key need one source',
      (telemetry, env) => {
        const { status, stderr } = runHook({ sandbox: SANDBOX, nightshift: { telemetry } }, env);
        expect(status).toBe(1);
        expect(stderr).toContain('requires both URL and API key from one source');
      }
    );

    it.each<Record<string, string>>([
      { NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL: 'https://shell.example.com' },
      { NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY: 'SECRET_SHELL_KEY' },
      { NIGHTSHIFT_SANDBOX_READABLE_INDICES: 'logs-*' },
    ])('rejects incomplete shell telemetry %j without echoing credentials', (env) => {
      const { status, stderr } = runHook({ sandbox: SANDBOX }, env);
      expect(status).toBe(1);
      expect(stderr).toContain('requires both URL and API key from one source');
      expect(stderr).not.toContain('SECRET_SHELL_KEY');
    });

    it.each(['profile', 'shell'])('rejects embedded URL credentials from %s', (source) => {
      const url = 'https://elastic:SECRET_PASSWORD@telemetry.example.com';
      const { status, stderr } =
        source === 'profile'
          ? runHook({ sandbox: SANDBOX, nightshift: { telemetry: { ...TELEMETRY, url } } })
          : runHook(
              { sandbox: SANDBOX },
              {
                NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL: url,
                NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY: 'remote-key',
              }
            );
      expect(status).toBe(1);
      expect(stderr).toContain('telemetry URL must not embed credentials');
      expect(stderr).not.toContain('SECRET_PASSWORD');
    });
  });
});

describe('ORCA CI shard', () => {
  const orca = { url: 'https://orca.example:443', apiKey: 'orca-key' };
  const existing = {
    sandbox: SANDBOX,
    nightshift: { telemetry: { url: 'https://customer0.example', apiKey: 'customer0-key' } },
  };
  it('replaces only the telemetry target and preserves sandbox authentication', () => {
    const { status, output, stderr } = runHook(
      { ...existing, nightshiftOrcaEs: orca },
      { EVAL_SHARD_ID: 'orcabench' }
    );
    expect(status).toBe(0);
    expect(stderr).not.toContain(orca.apiKey);
    expect(output.env).toMatchObject({
      SANDBOX_API_KEY: SANDBOX.apiKey,
      NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL: orca.url,
      NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY: orca.apiKey,
      NIGHTSHIFT_DATASETS: 'orcabench',
      NIGHTSHIFT_ORCA_TELEMETRY: '1',
    });
  });
  it('takes the manifest hint from config, falling back to one that names no incident window', () => {
    const configured = runHook(
      { ...existing, nightshiftOrcaEs: { ...orca, readableIndices: 'Read orca indices.' } },
      { EVAL_SHARD_ID: 'orcabench' }
    );
    expect(configured.output.env.NIGHTSHIFT_SANDBOX_READABLE_INDICES).toBe('Read orca indices.');
    const fallback = runHook(
      { ...existing, nightshiftOrcaEs: { ...orca, readableIndices: null } },
      { EVAL_SHARD_ID: 'orcabench' }
    );
    expect(fallback.output.env.NIGHTSHIFT_SANDBOX_READABLE_INDICES).toContain(
      'logs-orcabench.otel-*'
    );
    expect(fallback.output.env.NIGHTSHIFT_SANDBOX_READABLE_INDICES).not.toMatch(/2026|April/);
  });
  it.each(['c0', 'none'])(
    'uses ORCA telemetry despite a profile default of %s',
    (defaultTarget) => {
      const { output, status } = runHook(
        {
          ...existing,
          nightshiftOrcaEs: orca,
          nightshift: {
            ...existing.nightshift,
            defaultTelemetryTarget: defaultTarget,
            telemetryTargets: { c0: existing.nightshift.telemetry },
          },
        },
        { EVAL_SHARD_ID: 'orcabench' }
      );
      expect(status).toBe(0);
      const originalEnv = process.env;
      process.env = { ...originalEnv, ...output.env };
      try {
        const { xpack } = getConfigFromFiles([output.env.NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG]);
        expect(xpack.nightshift_investigations.sandbox.default_telemetry_target).toBeUndefined();
        expect(xpack.nightshift_investigations.sandbox.telemetry_connector_id).toBe(
          'nightshift-evals-telemetry'
        );
        expect(xpack.actions.preconfigured['nightshift-evals-telemetry']).toMatchObject({
          actionTypeId: '.http',
          config: { url: orca.url },
          secrets: { secretHeaders: { Authorization: `ApiKey ${orca.apiKey}` } },
        });
      } finally {
        process.env = originalEnv;
      }
    }
  );
  it('ignores a shared evals config, so the suite secret is the only source of the ORCA key', () => {
    const { status, stderr } = runHook(existing, {
      EVAL_SHARD_ID: 'orcabench',
      KBN_EVALS_CONFIG_B64: Buffer.from(JSON.stringify({ nightshiftOrcaEs: orca })).toString(
        'base64'
      ),
    });
    expect(status).toBe(1);
    expect(stderr).toContain('ORCA requires nightshiftOrcaEs');
  });
  it('keeps Customer-0 telemetry unchanged in the customer0 shard', () => {
    const { output } = runHook(
      { ...existing, nightshiftOrcaEs: orca },
      { EVAL_SHARD_ID: 'customer0' }
    );
    expect(output.env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL).toBe(existing.nightshift.telemetry.url);
    expect(output.env).not.toHaveProperty('NIGHTSHIFT_ORCA_TELEMETRY');
  });
  it('selects ORCA from NIGHTSHIFT_DATASETS for local runs outside CI', () => {
    const { output, status } = runHook(
      { ...existing, nightshiftOrcaEs: orca },
      { NIGHTSHIFT_DATASETS: 'orcabench' }
    );
    expect(status).toBe(0);
    expect(output.env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY).toBe(orca.apiKey);
  });
  it.each([
    undefined,
    { url: orca.url },
    { apiKey: orca.apiKey },
    { ...orca, url: 'https://user:password@orca.example' },
    { ...orca, readableIndices: '' },
  ])(
    'fails without a complete ORCA credential instead of using Customer-0 telemetry: %j',
    (nightshiftOrcaEs) => {
      const { status, stderr } = runHook(
        { ...existing, nightshiftOrcaEs },
        { EVAL_SHARD_ID: 'orcabench' }
      );
      expect(status).toBe(1);
      expect(stderr).toContain('ORCA requires nightshiftOrcaEs');
      expect(stderr).not.toContain('customer0-key');
    }
  );
});

describe('named telemetry targets', () => {
  const telemetryTargets = {
    c0: { url: 'https://c0.example.com', apiKey: 'c0-key', readableIndices: 'remote:logs-*' },
    orca: {
      url: 'https://orca.example.com',
      apiKey: 'orca-key',
      readableIndices: 'logs-orcabench.*',
    },
  };
  const profile = {
    sandbox: SANDBOX,
    nightshift: { telemetryTargets, defaultTelemetryTarget: 'c0' },
  };

  it('loads both sources on one stack and preserves unrelated connectors', () => {
    const { status, output } = runHook(profile);
    expect(status).toBe(0);
    expect(runHook(profile).output).toEqual(output);
    const generated = readFileSync(output.env.NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG, 'utf8');
    expect(generated).not.toContain('c0-key');
    expect(generated).not.toContain('orca-key');
    expect(generated).not.toContain(telemetryTargets.c0.url);
    expect(generated).not.toContain(telemetryTargets.orca.readableIndices);
    const originalEnv = process.env;
    const directory = mkdtempSync(Path.join(tmpdir(), 'named-telemetry-'));
    const existing = Path.join(directory, 'existing.yml');
    writeFileSync(existing, 'xpack.actions.preconfigured.existing.name: Existing');
    process.env = { ...originalEnv, ...output.env };
    try {
      const { xpack } = getConfigFromFiles([
        existing,
        output.env.SANDBOX_KIBANA_CONFIG,
        output.env.NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG,
      ]);
      expect(xpack.actions.preconfigured).toMatchObject({
        existing: { name: 'Existing' },
        'nightshift-evals-telemetry-c0': {
          actionTypeId: '.http',
          config: { url: telemetryTargets.c0.url },
          secrets: { secretHeaders: { Authorization: 'ApiKey c0-key' } },
        },
        'nightshift-evals-telemetry-orca': {
          actionTypeId: '.http',
          config: { url: telemetryTargets.orca.url },
          secrets: { secretHeaders: { Authorization: 'ApiKey orca-key' } },
        },
      });
      expect(xpack.nightshift_investigations.sandbox).toEqual({
        default_telemetry_target: 'c0',
        telemetry_targets: {
          c0: { connector_id: 'nightshift-evals-telemetry-c0', readable_indices: 'remote:logs-*' },
          orca: {
            connector_id: 'nightshift-evals-telemetry-orca',
            readable_indices: 'logs-orcabench.*',
          },
        },
      });
    } finally {
      process.env = originalEnv;
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('keeps legacy telemetry available alongside named targets', () => {
    const { output, status } = runHook({
      ...profile,
      nightshift: {
        ...profile.nightshift,
        telemetry: { url: 'https://legacy.example.com', apiKey: 'legacy-key' },
      },
    });
    expect(status).toBe(0);
    const generated = readFileSync(output.env.NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG, 'utf8');
    expect(generated).toContain('nightshift-evals-telemetry');
    expect(generated).not.toContain('legacy-key');
    expect(generated).not.toContain('https://legacy.example.com');
  });

  it('changes the Scout fingerprint when any named credential changes', () => {
    const { output } = runHook(profile);
    expect(
      runHook({
        ...profile,
        nightshift: {
          ...profile.nightshift,
          telemetryTargets: {
            ...telemetryTargets,
            orca: { ...telemetryTargets.orca, apiKey: 'rotated' },
          },
        },
      }).output
    ).not.toEqual(output);
  });

  it.each([
    { c0: { url: 'https://c0.example.com' } },
    { c0: { apiKey: 'SECRET_KEY' } },
    { none: telemetryTargets.c0 },
    { INVALID: telemetryTargets.c0 },
  ])('rejects invalid named blocks without echoing secrets', (targets) => {
    const { status, stderr } = runHook({
      sandbox: SANDBOX,
      nightshift: { telemetryTargets: targets },
    });
    expect(status).toBe(1);
    expect(stderr).not.toContain('SECRET_KEY');
  });

  it('rejects embedded credentials, unknown defaults, and missing sandbox credentials', () => {
    expect(
      runHook({
        sandbox: SANDBOX,
        nightshift: {
          telemetryTargets: {
            c0: { ...telemetryTargets.c0, url: 'https://user:SECRET_PASSWORD@c0.example.com' },
          },
        },
      }).stderr
    ).not.toContain('SECRET_PASSWORD');
    expect(
      runHook({
        sandbox: SANDBOX,
        nightshift: {
          telemetryTargets: {
            c0: { ...telemetryTargets.c0, url: 'https://user:password@c0.example.com' },
          },
        },
      }).status
    ).toBe(1);
    expect(
      runHook({
        ...profile,
        nightshift: { ...profile.nightshift, defaultTelemetryTarget: 'missing' },
      }).status
    ).toBe(1);
    expect(runHook({ nightshift: profile.nightshift }).status).toBe(1);
  });
});
