/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { http, HttpResponse } from 'msw';

export const defaultBenchmarks = http.get(
  'http://localhost/internal/cloud_security_posture/benchmarks',
  ({ request }) => {
    const url = new URL(request.url);
    const perPage = url.searchParams.get('per_page') || 100;
    const page = url.searchParams.get('page') || 1;

    return HttpResponse.json({
      items: [
        {
          package_policy: {
            id: '31d28c72-b846-4ba8-a372-83370f27b982',
            version: 'WzY4MTIsM10=',
            name: 'cspm 1715365366',
            namespace: 'default',
            description: '',
            package: {
              name: 'cloud_security_posture',
              title: 'Security Posture Management',
              version: '1.8.1',
            },
            enabled: true,
            policy_id: '25604943-99af-4b64-9970-7d176bd3278c',
            inputs: [
              {
                type: 'cloudbeat/cis_k8s',
                policy_template: 'kspm',
                enabled: false,
                streams: [
                  {
                    enabled: false,
                    data_stream: {
                      type: 'logs',
                      dataset: 'cloud_security_posture.findings',
                    },
                    id: 'cloudbeat/cis_k8s-cloud_security_posture.findings-31d28c72-b846-4ba8-a372-83370f27b982',
                  },
                ],
              },
              {
                type: 'cloudbeat/cis_eks',
                policy_template: 'kspm',
                enabled: false,
                streams: [
                  {
                    enabled: false,
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
                    },
                    id: 'cloudbeat/cis_eks-cloud_security_posture.findings-31d28c72-b846-4ba8-a372-83370f27b982',
                  },
                ],
              },
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
                    id: 'cloudbeat/cis_aws-cloud_security_posture.findings-31d28c72-b846-4ba8-a372-83370f27b982',
                    compiled_stream: {
                      period: '24h',
                      fetchers: [
                        {
                          name: 'aws-iam',
                        },
                        {
                          name: 'aws-ec2-network',
                        },
                        {
                          name: 'aws-s3',
                        },
                        {
                          name: 'aws-trail',
                        },
                        {
                          name: 'aws-monitoring',
                        },
                        {
                          name: 'aws-rds',
                        },
                      ],
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
              },
              {
                type: 'cloudbeat/cis_gcp',
                policy_template: 'cspm',
                enabled: false,
                streams: [
                  {
                    enabled: false,
                    data_stream: {
                      type: 'logs',
                      dataset: 'cloud_security_posture.findings',
                    },
                    vars: {
                      'gcp.account_type': {
                        type: 'text',
                      },
                      'gcp.organization_id': {
                        type: 'text',
                      },
                      'gcp.project_id': {
                        type: 'text',
                      },
                      'gcp.credentials.type': {
                        type: 'text',
                      },
                      'gcp.credentials.file': {
                        type: 'text',
                      },
                      'gcp.credentials.json': {
                        type: 'text',
                      },
                    },
                    id: 'cloudbeat/cis_gcp-cloud_security_posture.findings-31d28c72-b846-4ba8-a372-83370f27b982',
                  },
                ],
              },
              {
                type: 'cloudbeat/cis_azure',
                policy_template: 'cspm',
                enabled: false,
                streams: [
                  {
                    enabled: false,
                    data_stream: {
                      type: 'logs',
                      dataset: 'cloud_security_posture.findings',
                    },
                    vars: {
                      'azure.account_type': {
                        type: 'text',
                      },
                      'azure.credentials.type': {
                        type: 'text',
                      },
                      'azure.credentials.client_id': {
                        type: 'text',
                      },
                      'azure.credentials.tenant_id': {
                        type: 'text',
                      },
                      'azure.credentials.client_secret': {
                        type: 'text',
                      },
                      'azure.credentials.client_username': {
                        type: 'text',
                      },
                      'azure.credentials.client_password': {
                        type: 'text',
                      },
                      'azure.credentials.client_certificate_path': {
                        type: 'text',
                      },
                      'azure.credentials.client_certificate_password': {
                        type: 'text',
                      },
                    },
                    id: 'cloudbeat/cis_azure-cloud_security_posture.findings-31d28c72-b846-4ba8-a372-83370f27b982',
                  },
                ],
              },
              {
                type: 'cloudbeat/vuln_mgmt_aws',
                policy_template: 'vuln_mgmt',
                enabled: false,
                streams: [
                  {
                    enabled: false,
                    data_stream: {
                      type: 'logs',
                      dataset: 'cloud_security_posture.vulnerabilities',
                    },
                    id: 'cloudbeat/vuln_mgmt_aws-cloud_security_posture.vulnerabilities-31d28c72-b846-4ba8-a372-83370f27b982',
                  },
                ],
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
            revision: 2,
            created_at: '2024-05-10T18:22:48.784Z',
            created_by: 'system',
            updated_at: '2024-05-10T18:23:07.946Z',
            updated_by: 'system',
          },
          agent_policy: {
            id: '25604943-99af-4b64-9970-7d176bd3278c',
            name: 'Agent Policy 1715365356',
            agents: 0,
          },
          rules_count: 55,
        },
      ],
      total: 1,
      page,
      perPage,
    });
  }
);
