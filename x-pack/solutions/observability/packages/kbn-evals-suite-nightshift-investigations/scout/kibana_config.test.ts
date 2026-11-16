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
import { CONNECTOR_SETS } from '../evals/investigation/connector_sets';

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
    NIGHTSHIFT_ES_URL: 'https://orca.example.com',
    NIGHTSHIFT_ES_API_KEY: 'remote-key',
  };
  try {
    const config = getConfigFromFiles([
      existingConfig,
      Path.join(
        REPO_ROOT,
        'src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/evals_nightshift_investigations/kibana.tracing.yml'
      ),
      Path.join(__dirname, 'kibana.sandbox.yml'),
      Path.join(__dirname, 'connector_sets/orcabench.yml'),
    ]);
    expect(config.xpack.actions.preconfigured).toEqual({
      existing: { name: 'Existing connector' },
      'orcabench-es': {
        name: 'orcabench_es',
        actionTypeId: '.elasticsearch',
        config: { url: 'https://orca.example.com', selectedActions: ['_test'] },
        secrets: { authType: 'api_key_header', Authorization: 'ApiKey remote-key' },
      },
    });
    expect(config.xpack.sandbox.api_key).toBe('sandbox-key');
    expect(config.xpack.sandbox.ssl).toEqual({
      certificate: '/certs/tls.crt',
      key: '/certs/tls.key',
      certificate_authorities: '',
    });
    // Connectors are saved on the investigator by the eval, not configured on the plugin.
    expect(config.xpack.nightshift_investigations).toBeUndefined();
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

it.each(Object.entries(CONNECTOR_SETS))(
  'connector set %s preconfigures exactly the connectors the eval saves',
  (connectorSet, connectorIds) => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      NIGHTSHIFT_ES_URL: 'https://es.example.com',
      NIGHTSHIFT_ES_API_KEY: 'es-key',
    };
    try {
      const config = getConfigFromFiles([
        Path.join(__dirname, `connector_sets/${connectorSet}.yml`),
      ]);
      expect(Object.keys(config.xpack.actions.preconfigured).sort()).toEqual(
        [...connectorIds].sort()
      );
    } finally {
      process.env = originalEnv;
    }
  }
);
