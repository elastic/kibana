/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { INTEGRATION_PACKAGE_NAME, INPUT_CONTROL, ALERTS_DATASET } from '../../common/constants';

const MOCK_YAML_CONFIGURATION = `
selectors:
  # default selector (user can modify or remove if they want)
  - name: default
    operation: [createExecutable, modifyExecutable, execMemFd]

  # example custom selector
  - name: nginxOnly
    containerImageName:
      - nginx

  # example selector used for exclude
  - name: excludeCustomNginxBuild
    containerImageTag:
      - staging

# responses are evaluated from top to bottom
# only the first response with a match will run its actions
responses:
  - match: [nginxOnly]
    exclude: [excludeCustomNginxBuild]
    actions: [alert, block]

  # default response
  # delete this if no default response needed
  - match: [default]
    actions: [alert]
`;

export const MOCK_YAML_INVALID_CONFIGURATION = `
selectrs:
reeesponses:
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
    title: 'Kubernetes Security Posture Management',
    version: '0.0.21',
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
    title: 'Kubernetes Security Posture Management',
    version: '0.0.21',
  },
});
