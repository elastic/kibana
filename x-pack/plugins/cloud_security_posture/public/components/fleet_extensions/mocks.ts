/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { PostureInput } from '../../../common/constants';

export const getMockPolicyAWS = () => getPolicyMock('cloudbeat/cis_aws');
export const getMockPolicyK8s = () => getPolicyMock('cloudbeat/cis_k8s');
export const getMockPolicyEKS = () => getPolicyMock('cloudbeat/cis_eks');

export const getPolicyMock = (type: PostureInput): NewPackagePolicy => {
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
        enabled: type === 'cloudbeat/cis_k8s',
        streams: [
          {
            enabled: type === 'cloudbeat/cis_k8s',
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
        enabled: type === 'cloudbeat/cis_eks',
        streams: [
          {
            enabled: type === 'cloudbeat/cis_eks',
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
        enabled: type === 'cloudbeat/cis_aws',
        streams: [
          {
            enabled: type === 'cloudbeat/cis_aws',
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
        value: type === 'cloudbeat/cis_k8s' || type === 'cloudbeat/cis_eks' ? 'kspm' : 'cspm',
        type: 'text',
      },
      deployment: {
        value: type,
        type: 'text',
      },
    },
  };
};
