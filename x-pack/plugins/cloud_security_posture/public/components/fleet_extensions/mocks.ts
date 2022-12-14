/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
// import type { PackagePolicy } from '@kbn/fleet-plugin/common';
// import { BenchmarkId } from '../../../common/types';

import { NewPackagePolicy } from '@kbn/fleet-plugin/common';

export const getMockPolicyAWS = (): NewPackagePolicy => {
  return {
    name: 'cloud_security_posture-5',
    description: '',
    namespace: 'default',
    policy_id: '',
    enabled: true,
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
                value: 'assume_role',
                type: 'text',
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
                type: 'password',
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
                value: 'assume_role',
                type: 'text',
              },
            },
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
          },
        ],
      },
    ],
    package: {
      name: 'cloud_security_posture',
      title: 'Security Posture Management (CSPM/KSPM)',
      version: '1.1.1',
    },
    vars: {
      posture: {
        value: 'cspm',
        type: 'text',
      },
      deployment: {
        value: 'cloudbeat/cis_aws',
        type: 'text',
      },
    },
  };
};
// import { CLOUDBEAT_EKS, CLOUDBEAT_VANILLA } from '../../../common/constants';
export const getMockPolicyK8s = (): NewPackagePolicy => {
  return {
    name: 'cloud_security_posture-4',
    description: '',
    namespace: 'default',
    policy_id: '',
    enabled: true,
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
          },
        ],
      },
      {
        type: 'cloudbeat/cis_aws',
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
              access_key_id: {
                type: 'text',
              },
              secret_access_key: {
                type: 'password',
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
          },
        ],
      },
    ],
    package: {
      name: 'cloud_security_posture',
      title: 'Security Posture Management (CSPM/KSPM)',
      version: '1.1.1',
    },
    vars: {
      posture: {
        value: 'kspm',
        type: 'text',
      },
      deployment: {
        value: 'cloudbeat/cis_k8s',
        type: 'text',
      },
    },
  };
};
export const getMockPolicyEKS = (): NewPackagePolicy => {
  // EKS
  return {
    name: 'cloud_security_posture-4',
    description: '',
    namespace: 'default',
    policy_id: '',
    enabled: true,
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
          },
        ],
      },
      {
        type: 'cloudbeat/cis_eks',
        policy_template: 'kspm',
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
                value: 'assume_role',
                type: 'text',
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
          },
        ],
      },
      {
        type: 'cloudbeat/cis_aws',
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
              access_key_id: {
                type: 'text',
              },
              secret_access_key: {
                type: 'password',
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
                value: 'assume_role',
                type: 'text',
              },
            },
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
          },
        ],
      },
    ],
    package: {
      name: 'cloud_security_posture',
      title: 'Security Posture Management (CSPM/KSPM)',
      version: '1.1.1',
    },
    vars: {
      posture: {
        value: 'kspm',
        type: 'text',
      },
      deployment: {
        value: 'cloudbeat/cis_eks',
        type: 'text',
      },
    },
  };
};
