/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { getConfigFromFiles } from '@kbn/config';
import { schema } from '@kbn/config-schema';

const exporters = [
  { http: { url: 'https://traces.example.com', headers: { Authorization: 'ApiKey trace-key' } } },
];

const sandboxEnv = {
  SANDBOX_API_KEY: 'sandbox-key',
  SANDBOX_CLIENT_CERT_PATH: '/certs/tls.crt',
  SANDBOX_CLIENT_KEY_PATH: '/certs/tls.key',
  SANDBOX_CA_CERT_PATH: '',
  NIGHTSHIFT_TRACING_EXPORTERS: JSON.stringify(exporters),
};

const telemetryEnv = {
  NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL: 'https://telemetry.example.com',
  NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY: 'remote-key',
  NIGHTSHIFT_SANDBOX_READABLE_INDICES: 'remote:logs-*',
};

// The Kibana test server keeps only the last --config flag, so each file must stand alone.
const loadAlone = (file: string, env: Record<string, string>) => {
  const originalEnv = process.env;
  process.env = { ...originalEnv, ...env };
  try {
    return getConfigFromFiles([Path.join(__dirname, file)]);
  } finally {
    process.env = originalEnv;
  }
};

const expectSandboxAndTracing = (config: ReturnType<typeof getConfigFromFiles>) => {
  expect(config.xpack.sandbox).toEqual({
    enabled: true,
    host: 'localhost',
    port: '9090',
    api_key: 'sandbox-key',
    ssl: { certificate: '/certs/tls.crt', key: '/certs/tls.key', certificate_authorities: '' },
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
};

it('kibana.sandbox.yml configures the sandbox and tracing without remote telemetry', () => {
  const config = loadAlone('kibana.sandbox.yml', sandboxEnv);
  expectSandboxAndTracing(config);
  expect(config.xpack.actions).toBeUndefined();
  expect(config.xpack.nightshift_investigations).toBeUndefined();
});

it('kibana.sandbox_telemetry.yml also configures the remote telemetry connector', () => {
  const config = loadAlone('kibana.sandbox_telemetry.yml', { ...sandboxEnv, ...telemetryEnv });
  expectSandboxAndTracing(config);
  expect(config.xpack.actions.preconfigured).toEqual({
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
  expect(config.xpack.nightshift_investigations.sandbox).toEqual({
    telemetry_connector_id: 'nightshift-evals-telemetry',
    telemetry_readable_indices: 'remote:logs-*',
  });
});
