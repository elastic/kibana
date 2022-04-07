/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { configSchema, createConfig } from './config';

const MOCKED_PATHS = [
  '/proc/self/cgroup',
  'packages/kbn-dev-utils/certs/ca.crt',
  'packages/kbn-dev-utils/certs/elasticsearch.crt',
  'packages/kbn-dev-utils/certs/elasticsearch.key',
];

beforeEach(() => {
  jest.spyOn(fs, 'readFileSync').mockImplementation((path, enc) => {
    if (typeof path === 'string' && MOCKED_PATHS.includes(path) && enc === 'utf8') {
      return `contents-of-${path}`;
    }

    throw new Error(`unpexpected arguments to fs.readFileSync: ${path}, ${enc}`);
  });
});

describe('config schema', () => {
  it('generates proper defaults', () => {
    expect(configSchema.validate({})).toMatchInlineSnapshot(`
      Object {
        "agent": Object {
          "interval": "10s",
        },
        "cluster_alerts": Object {
          "email_notifications": Object {
            "email_address": "",
            "enabled": true,
          },
          "enabled": true,
        },
        "kibana": Object {
          "collection": Object {
            "enabled": true,
            "interval": 10000,
          },
        },
        "licensing": Object {
          "api_polling_frequency": "PT30S",
        },
        "tests": Object {
          "cloud_detector": Object {
            "enabled": true,
          },
        },
        "ui": Object {
          "ccs": Object {
            "enabled": true,
            "remotePatterns": "*",
          },
          "container": Object {
            "apm": Object {
              "enabled": false,
            },
            "elasticsearch": Object {
              "enabled": false,
            },
            "logstash": Object {
              "enabled": false,
            },
          },
          "debug_log_path": "",
          "debug_mode": false,
          "elasticsearch": Object {
            "apiVersion": "master",
            "compression": false,
            "customHeaders": Object {},
            "healthCheck": Object {
              "delay": "PT2.5S",
            },
            "ignoreVersionMismatch": false,
            "logFetchCount": 10,
            "logQueries": false,
            "maxSockets": Infinity,
            "pingTimeout": "PT30S",
            "requestHeadersWhitelist": Array [
              "authorization",
            ],
            "requestTimeout": "PT30S",
            "shardTimeout": "PT30S",
            "skipStartupConnectionCheck": false,
            "sniffInterval": false,
            "sniffOnConnectionFault": false,
            "sniffOnStart": false,
            "ssl": Object {
              "alwaysPresentCertificate": false,
              "keystore": Object {},
              "truststore": Object {},
              "verificationMode": "full",
            },
          },
          "enabled": true,
          "logs": Object {
            "index": "filebeat-*",
          },
          "max_bucket_size": 10000,
          "metricbeat": Object {
            "index": "metricbeat-*",
          },
          "min_interval_seconds": 10,
          "show_license_expiration": true,
        },
      }
    `);
  });
});

describe('createConfig()', () => {
  it('should wrap in Elasticsearch config', async () => {
    const config = createConfig(
      configSchema.validate({
        ui: {
          elasticsearch: {
            hosts: 'http://localhost:9200',
          },
        },
      })
    );
    expect(config.ui.elasticsearch.hosts).toEqual(['http://localhost:9200']);
  });

  it('should attempt to read PEM files', async () => {
    const ssl = {
      certificate: 'packages/kbn-dev-utils/certs/elasticsearch.crt',
      key: 'packages/kbn-dev-utils/certs/elasticsearch.key',
      certificateAuthorities: 'packages/kbn-dev-utils/certs/ca.crt',
    };
    const config = createConfig(
      configSchema.validate({
        ui: {
          elasticsearch: {
            ssl,
          },
        },
      })
    );
    const expected = expect.objectContaining({
      certificate: 'contents-of-packages/kbn-dev-utils/certs/elasticsearch.crt',
      key: 'contents-of-packages/kbn-dev-utils/certs/elasticsearch.key',
      certificateAuthorities: ['contents-of-packages/kbn-dev-utils/certs/ca.crt'],
    });
    expect(config.ui.elasticsearch.ssl).toEqual(expected);
  });
  it('accepts both string and array of strings for ui.ccs.remotePatterns', () => {
    let configValue = createConfig(
      configSchema.validate({
        ui: {
          ccs: {
            remotePatterns: 'remote1',
          },
        },
      })
    );
    expect(configValue.ui.ccs.remotePatterns).toEqual(['remote1']);
    configValue = createConfig(
      configSchema.validate({
        ui: {
          ccs: {
            remotePatterns: ['remote1'],
          },
        },
      })
    );
    expect(configValue.ui.ccs.remotePatterns).toEqual(['remote1']);
    configValue = createConfig(
      configSchema.validate({
        ui: {
          ccs: {
            remotePatterns: ['remote1', 'remote2'],
          },
        },
      })
    );
    expect(configValue.ui.ccs.remotePatterns).toEqual(['remote1', 'remote2']);
  });
});

describe('throws when config is invalid', () => {
  describe('ui.ccs.remotePattern errors', () => {
    it('throws error with a space', () => {
      expect(() => {
        configSchema.validate({ ui: { ccs: { remotePatterns: 'my remote' } } });
      }).toThrowError();
    });
    it('throws error when wildcard (*) pattern is used in an array', () => {
      expect(() => {
        configSchema.validate({ ui: { ccs: { remotePatterns: ['remote1', '*'] } } });
      }).toThrowError();
    });
    it('throws error with an invalid remote name', () => {
      expect(() => {
        configSchema.validate({ ui: { ccs: { remotePatterns: 'remote-*' } } });
      }).toThrowError();
      expect(() => {
        configSchema.validate({ ui: { ccs: { remotePatterns: 'remote1, remote2' } } });
      }).toThrowError();
    });
  });
});
