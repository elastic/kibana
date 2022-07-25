/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CLOUD_KIBANA_WITHOUT_PACKAGE_POLICY_ID_CONFIG = {
  xpack: {
    fleet: {
      packages: [
        {
          name: 'apm',
          version: 'latest',
        },
        {
          name: 'fleet_server',
          version: 'latest',
        },
        {
          name: 'system',
          version: 'latest',
        },
      ],
      outputs: [
        {
          name: 'Elastic Cloud internal output',
          type: 'elasticsearch',
          id: 'es-containerhost',
          hosts: ['https://cloudinternales:9200'],
        },
      ],
      agentPolicies: [
        {
          name: 'Elastic Cloud agent policy',
          description: 'Default agent policy for agents hosted on Elastic Cloud',
          id: 'policy-elastic-agent-on-cloud',
          data_output_id: 'es-containerhost',
          monitoring_output_id: 'es-containerhost',
          is_default: false,
          is_managed: true,
          is_default_fleet_server: false,
          namespace: 'default',
          monitoring_enabled: [],
          unenroll_timeout: 86400,
          package_policies: [
            {
              name: 'Fleet Server',
              package: {
                name: 'fleet_server',
              },
              inputs: [
                {
                  type: 'fleet-server',
                  keep_enabled: true,
                  vars: [
                    {
                      name: 'host',
                      value: '0.0.0.0',
                      frozen: true,
                    },
                    {
                      name: 'port',
                      value: 8220,
                      frozen: true,
                    },
                    {
                      name: 'custom',
                      value:
                        'server.runtime:\n  gc_percent: 20          # Force the GC to execute more frequently: see https://golang.org/pkg/runtime/debug/#SetGCPercent\n',
                    },
                  ],
                },
              ],
            },
            {
              name: 'Elastic APM',
              package: {
                name: 'apm',
              },
              inputs: [
                {
                  type: 'apm',
                  keep_enabled: true,
                  vars: [
                    {
                      name: 'api_key_enabled',
                      value: true,
                    },
                    {
                      name: 'host',
                      value: '0.0.0.0:8200',
                      frozen: true,
                    },
                    {
                      name: 'secret_token',
                      value: 'CLOUD_SECRET_TOKEN',
                    },
                    {
                      name: 'tls_enabled',
                      value: true,
                      frozen: true,
                    },
                    {
                      name: 'tls_certificate',
                      value: '/app/config/certs/node.crt',
                      frozen: true,
                    },
                    {
                      name: 'tls_key',
                      value: '/app/config/certs/node.key',
                      frozen: true,
                    },
                    {
                      name: 'url',
                      value: 'CLOUD_APM_URL',
                      frozen: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'Default policy',
          id: 'default-policy',
          description: 'Default agent policy created by Kibana',
          is_default: true,
          is_managed: false,
          namespace: 'default',
          monitoring_enabled: ['logs', 'metrics'],
          package_policies: [
            {
              name: 'system-1',
              id: 'default-system',
              package: {
                name: 'system',
              },
            },
          ],
        },
      ],
    },
  },
};
