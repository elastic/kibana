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

describe('nightshift-investigations scout hook', () => {
  it('rejects sandbox settings without an API key instead of silently running only smoke', () => {
    const { status, stderr } = runHook({ sandbox: { url: 'https://sandbox.example.com' } });
    expect(status).toBe(1);
    expect(stderr).toContain('sandbox host port set without an API key');
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

  describe('telemetry configuration', () => {
    const TELEMETRY = {
      url: 'https://remote.example.com',
      apiKey: 'remote-key',
      readableIndices: 'remote:logs-*',
    };

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
