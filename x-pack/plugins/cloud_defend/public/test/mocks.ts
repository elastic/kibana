/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { INTEGRATION_PACKAGE_NAME, INPUT_CONTROL, ALERTS_DATASET } from '../../common/constants';

export const MOCK_YAML_CONFIGURATION = `file:
  selectors:
    - name: default
      operation:
        - createExecutable
        - modifyExecutable
    - name: nginxOnly
      containerImageName:
        - nginx
    - name: excludeCustomNginxBuild
      containerImageTag:
        - staging
  responses:
    - match:
        - nginxOnly
      exclude:
        - excludeCustomNginxBuild
      actions:
        - alert
        - block
    - match:
        - default
      actions:
        - alert
`;

export const MOCK_YAML_INVALID_CONFIGURATION = `
s
`;

export const getCloudDefendNewPolicyMock = (yaml = MOCK_YAML_CONFIGURATION): NewPackagePolicy => ({
  name: 'some-cloud_defend-policy',
  description: '',
  namespace: 'default',
  policy_id: '',
  enabled: true,
  inputs: [
    {
      type: INPUT_CONTROL,
      policy_template: INTEGRATION_PACKAGE_NAME,
      enabled: true,
      vars: {
        configuration: {
          type: 'yaml',
          value: yaml,
        },
      },
      streams: [
        {
          enabled: true,
          data_stream: {
            type: 'logs',
            dataset: ALERTS_DATASET,
          },
        },
      ],
    },
  ],
  package: {
    name: 'cloud_defend',
    title: 'Container drift prevention',
    version: '1.0.0',
  },
});

export const getCloudDefendPolicyMock = (yaml = MOCK_YAML_CONFIGURATION): PackagePolicy => ({
  id: 'c6d16e42-c32d-4dce-8a88-113cfe276ad1',
  version: 'abcd',
  revision: 1,
  updated_at: '2020-06-25T16:03:38.159292',
  updated_by: 'kibana',
  created_at: '2020-06-25T16:03:38.159292',
  created_by: 'kibana',
  name: 'some-cloud_defend-policy',
  description: '',
  namespace: 'default',
  policy_id: '',
  enabled: true,
  inputs: [
    {
      type: INPUT_CONTROL,
      policy_template: INTEGRATION_PACKAGE_NAME,
      enabled: true,
      vars: {
        configuration: {
          type: 'yaml',
          value: yaml,
        },
      },
      streams: [
        {
          id: '1234',
          enabled: true,
          data_stream: {
            type: 'logs',
            dataset: ALERTS_DATASET,
          },
        },
      ],
    },
  ],
  package: {
    name: 'cloud_defend',
    title: 'Container drift prevention',
    version: '1.0.0',
  },
});
