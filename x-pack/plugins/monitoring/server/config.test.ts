/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import { when } from 'jest-when';

import { createConfig, configSchema } from './config';

const MOCKED_PATHS = [
  '/proc/self/cgroup',
  'packages/kbn-dev-utils/certs/ca.crt',
  'packages/kbn-dev-utils/certs/elasticsearch.crt',
  'packages/kbn-dev-utils/certs/elasticsearch.key',
];

beforeEach(() => {
  const spy = jest.spyOn(fs, 'readFileSync').mockImplementation();
  MOCKED_PATHS.forEach((file) => when(spy).calledWith(file).mockReturnValue(`contents-of-${file}`));
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
        "enabled": true,
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
          },
          "container": Object {
            "elasticsearch": Object {
              "enabled": false,
            },
            "logstash": Object {
              "enabled": false,
            },
          },
          "elasticsearch": Object {
            "apiVersion": "master",
            "customHeaders": Object {},
            "healthCheck": Object {
              "delay": "PT2.5S",
            },
            "ignoreVersionMismatch": false,
            "logFetchCount": 10,
            "logQueries": false,
            "pingTimeout": "PT30S",
            "requestHeadersWhitelist": Array [
              "authorization",
            ],
            "requestTimeout": "PT30S",
            "shardTimeout": "PT30S",
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
});
