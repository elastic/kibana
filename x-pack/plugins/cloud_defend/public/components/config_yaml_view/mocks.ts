/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { INTEGRATION_PACKAGE_NAME } from '../../../common/constants';

export const getCloudDefendNewPolicyMock = (): NewPackagePolicy => ({
  name: 'some-cloud_defend-policy',
  description: '',
  namespace: 'default',
  policy_id: '',
  enabled: true,
  inputs: [
    {
      type: INTEGRATION_PACKAGE_NAME,
      policy_template: 'kspm',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: {
            type: 'logs',
            dataset: 'cloud_defend.findings',
          },
        },
      ],
    },
  ],
  package: {
    name: 'cloud_defend',
    title: 'Kubernetes Security Posture Management',
    version: '0.0.21',
  },
  vars: {
    runtimeCfg: {
      type: 'yaml',
    },
  },
});

export const getCloudDefendPolicyMock = (): PackagePolicy => ({
  ...getCloudDefendNewPolicyMock(),
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
            dataset: 'cloud_defend.findings',
          },
          id: 'cloudbeat/vanilla-cloud_defend.findings-de97ed6f-5024-46af-a4f9-9acd7bd012d8',
          enabled: true,
        },
      ],
      type: INTEGRATION_PACKAGE_NAME,
      enabled: true,
    },
    {
      policy_template: 'kspm',
      streams: [
        {
          data_stream: {
            type: 'logs',
            dataset: 'cloud_defend.findings',
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
          id: 'cloudbeat/eks-cloud_defend.findings-de97ed6f-5024-46af-a4f9-9acd7bd012d8',
          enabled: false,
        },
      ],
      type: INTEGRATION_PACKAGE_NAME,
      enabled: true,
    },
  ],
  vars: {
    configuration: {
      type: 'yaml',
      value: 'data_yaml:\n  activated_rules:\n    cis_k8s: []\n    cis_eks:\n      - cis_3_1_4\n ',
    },
  },
});
