/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { BenchmarkId } from '../../../common/types';
import { CLOUDBEAT_EKS, CLOUDBEAT_VANILLA } from '../../../common/constants';

export const getCspNewPolicyMock = (type: BenchmarkId = 'cis_k8s'): NewPackagePolicy => ({
  name: 'some-cloud_security_posture-policy',
  description: '',
  namespace: 'default',
  policy_id: '',
  enabled: true,
  output_id: '',
  inputs: [
    {
      type: CLOUDBEAT_VANILLA,
      policy_template: 'kspm',
      enabled: type === 'cis_k8s',
      streams: [
        {
          enabled: type === 'cis_k8s',
          data_stream: {
            type: 'logs',
            dataset: 'cloud_security_posture.findings',
          },
        },
      ],
    },
    {
      type: CLOUDBEAT_EKS,
      policy_template: 'kspm',
      enabled: type === 'cis_eks',
      streams: [
        {
          enabled: type === 'cis_eks',
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
          },
        },
      ],
    },
  ],
  package: {
    name: 'cloud_security_posture',
    title: 'Kubernetes Security Posture Management',
    version: '0.0.21',
  },
  vars: {
    runtimeCfg: {
      type: 'yaml',
    },
  },
});

export const getCspPolicyMock = (type: BenchmarkId = 'cis_k8s'): PackagePolicy => ({
  ...getCspNewPolicyMock(type),
  id: 'c6d16e42-c32d-4dce-8a88-113cfe276ad1',
  version: 'abcd',
  revision: 1,
  updated_at: '2020-06-25T16:03:38.159292',
  updated_by: 'kibana',
  created_at: '2020-06-25T16:03:38.159292',
  created_by: 'kibana',
  inputs: [
    {
      policy_template: 'kspm',
      streams: [
        {
          compiled_stream: {
            data_yaml: {
              activated_rules: {
                cis_k8s: [],
                cis_eks: ['cis_3_1_4'],
              },
            },
            name: 'Findings',
            processors: [{ add_cluster_id: null }],
          },
          data_stream: {
            type: 'logs',
            dataset: 'cloud_security_posture.findings',
          },
          id: 'cloudbeat/vanilla-cloud_security_posture.findings-de97ed6f-5024-46af-a4f9-9acd7bd012d8',
          enabled: true,
        },
      ],
      type: CLOUDBEAT_VANILLA,
      enabled: type === 'cis_k8s',
    },
    {
      policy_template: 'kspm',
      streams: [
        {
          data_stream: {
            type: 'logs',
            dataset: 'cloud_security_posture.findings',
          },
          vars: {
            access_key_id: {
              type: 'text',
            },
            session_token: {
              type: 'text',
            },
            secret_access_key: {
              type: 'text',
            },
          },
          id: 'cloudbeat/eks-cloud_security_posture.findings-de97ed6f-5024-46af-a4f9-9acd7bd012d8',
          enabled: false,
        },
      ],
      type: CLOUDBEAT_EKS,
      enabled: type === 'cis_eks',
    },
  ],
  vars: {
    dataYaml: {
      type: 'yaml',
      value: 'data_yaml:\n  activated_rules:\n    cis_k8s: []\n    cis_eks:\n      - cis_3_1_4\n ',
    },
  },
});
