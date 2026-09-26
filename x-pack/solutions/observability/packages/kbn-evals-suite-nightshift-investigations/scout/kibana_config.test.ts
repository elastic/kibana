/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { getConfigFromFiles } from '@kbn/config';
import { schema } from '@kbn/config-schema';

it('resolves credentials from the environment and preserves other preconfigured connectors', () => {
  const originalEnv = process.env;
  const directory = mkdtempSync(Path.join(tmpdir(), 'nightshift-yaml-'));
  const existingConfig = Path.join(directory, 'existing.yml');
  const exporters = [
    { http: { url: 'https://traces.example.com', headers: { Authorization: 'ApiKey trace-key' } } },
  ];
  writeFileSync(existingConfig, 'xpack.actions.preconfigured.existing.name: Existing connector');
  process.env = {
    ...originalEnv,
    SANDBOX_API_KEY: 'sandbox-key',
    SANDBOX_CLIENT_CERT_PATH: '/certs/tls.crt',
    SANDBOX_CLIENT_KEY_PATH: '/certs/tls.key',
    SANDBOX_CA_CERT_PATH: '',
    NIGHTSHIFT_TRACING_EXPORTERS: JSON.stringify(exporters),
    NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL: 'https://telemetry.example.com',
    NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY: 'remote-key',
    NIGHTSHIFT_SANDBOX_READABLE_INDICES: 'remote:logs-*',
  };
  try {
    const config = getConfigFromFiles([
      existingConfig,
      Path.join(
        REPO_ROOT,
        'src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/evals_nightshift_investigations/stateful/kibana.tracing.yml'
      ),
      Path.join(__dirname, 'kibana.sandbox.yml'),
      Path.join(__dirname, 'kibana.telemetry.yml'),
    ]);
    expect(config.xpack.actions.preconfigured).toEqual({
      existing: { name: 'Existing connector' },
      'nightshift-evals-telemetry': {
        name: 'Remote Elasticsearch telemetry',
        actionTypeId: '.webhook',
        config: {
          url: 'https://telemetry.example.com',
          method: 'post',
          hasAuth: false,
          authType: null,
        },
        secrets: { secretHeaders: { Authorization: 'ApiKey remote-key' } },
      },
    });
    expect(config.xpack.sandbox.api_key).toBe('sandbox-key');
    expect(config.xpack.sandbox.ssl).toEqual({
      certificate: '/certs/tls.crt',
      key: '/certs/tls.key',
      certificate_authorities: '',
    });
    expect(config.xpack.nightshift_investigations.sandbox).toEqual({
      telemetry_connector_id: 'nightshift-evals-telemetry',
      telemetry_readable_indices: 'remote:logs-*',
    });
    expect(
      schema
        .arrayOf(
          schema.object({
            http: schema.object({
              url: schema.string(),
              headers: schema.recordOf(schema.string(), schema.string()),
            }),
          })
        )
        .validate(config.telemetry.tracing.exporters)
    ).toEqual(exporters);
  } finally {
    process.env = originalEnv;
    rmSync(directory, { recursive: true, force: true });
  }
});
