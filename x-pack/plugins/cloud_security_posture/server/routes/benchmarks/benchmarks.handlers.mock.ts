/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { http, HttpResponse } from 'msw';

export const cspmInstalledHandler = http.get('/internal/cloud_security_posture/benchmarks', () => {
  return HttpResponse.json({
    items: [
      {
        package_policy: {
          id: '630f3e42-659e-4499-9007-61e36adf1d97',
          name: 'cspm-1',
          namespace: 'default',
          description: '',
          package: {
            name: 'cloud_security_posture',
            title: 'Security Posture Management',
            version: '1.9.0',
          },
          enabled: true,
          policy_id: '30cba674-531c-4225-b392-3f7810957511',
          inputs: [
            {
              type: 'cloudbeat/cis_aws',
              policy_template: 'cspm',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: {
                    type: 'logs',
                    dataset: 'cloud_security_posture.findings',
                  },
                  vars: {
                    access_key_id: {
                      type: 'text',
                    },
                    secret_access_key: {
                      type: 'text',
                    },
                    session_token: {
                      type: 'text',
                    },
                    shared_credential_file: {
                      type: 'text',
                    },
                    credential_profile_name: {
                      type: 'text',
                    },
                    role_arn: {
                      type: 'text',
                    },
                    'aws.credentials.type': {
                      type: 'text',
                    },
                    'aws.account_type': {
                      value: 'organization-account',
                      type: 'text',
                    },
                  },
                  id: 'cloudbeat/cis_aws-cloud_security_posture.findings-630f3e42-659e-4499-9007-61e36adf1d97',
                  compiled_stream: {
                    period: '24h',
                    config: {
                      v1: {
                        type: 'cspm',
                        deployment: 'aws',
                        benchmark: 'cis_aws',
                        aws: {
                          account_type: 'organization-account',
                          credentials: {
                            type: null,
                          },
                        },
                      },
                    },
                  },
                },
              ],
              config: {
                cloud_formation_template_url: {
                  value:
                    'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-cspm-ACCOUNT_TYPE-8.14.0.yml&stackName=Elastic-Cloud-Security-Posture-Management&param_EnrollmentToken=FLEET_ENROLLMENT_TOKEN&param_FleetUrl=FLEET_URL&param_ElasticAgentVersion=KIBANA_VERSION&param_ElasticArtifactServer=https://artifacts.elastic.co/downloads/beats/elastic-agent',
                },
              },
            },
          ],
          vars: {
            posture: {
              value: 'cspm',
              type: 'text',
            },
            deployment: {
              value: 'aws',
              type: 'text',
            },
          },
          revision: 1,
          created_at: '2024-06-03T21:06:20.786Z',
          created_by: 'system',
          updated_at: '2024-06-03T21:06:20.786Z',
          updated_by: 'system',
        },
        agent_policy: {
          id: '30cba674-531c-4225-b392-3f7810957511',
          name: 'Agent policy 3',
          agents: 0,
        },
        rules_count: 55,
      },
    ],
    total: 1,
    page: 1,
    perPage: 100,
  });
});

export const kspmInstalledHandler = http.get('/internal/cloud_security_posture/benchmarks', () => {
  return HttpResponse.json({
    items: [
      {
        package_policy: {
          id: '6aedf856-bc21-49aa-859a-a0952789f898',
          version: 'WzE4ODcxLDE0XQ==',
          name: 'kspm-1',
          namespace: 'default',
          description: '',
          package: {
            name: 'cloud_security_posture',
            title: 'Security Posture Management',
            version: '1.9.0',
          },
          enabled: true,
          policy_id: 'e2f72eea-bf76-4576-bed8-e29d2df102a7',
          inputs: [
            {
              type: 'cloudbeat/cis_k8s',
              policy_template: 'kspm',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: {
                    type: 'logs',
                    dataset: 'cloud_security_posture.findings',
                  },
                  id: 'cloudbeat/cis_k8s-cloud_security_posture.findings-6aedf856-bc21-49aa-859a-a0952789f898',
                  compiled_stream: {
                    config: {
                      v1: {
                        type: 'kspm',
                        deployment: 'self_managed',
                        benchmark: 'cis_k8s',
                      },
                    },
                  },
                },
              ],
            },
          ],
          vars: {
            posture: {
              value: 'kspm',
              type: 'text',
            },
            deployment: {
              value: 'self_managed',
              type: 'text',
            },
          },
          revision: 1,
          created_at: '2024-06-03T21:23:23.139Z',
          created_by: 'system',
          updated_at: '2024-06-03T21:23:23.139Z',
          updated_by: 'system',
        },
        agent_policy: {
          id: 'e2f72eea-bf76-4576-bed8-e29d2df102a7',
          name: 'Agent policy 1',
          agents: 0,
        },
        rules_count: 92,
      },
    ],
    total: 1,
    page: 1,
    perPage: 100,
  });
});
