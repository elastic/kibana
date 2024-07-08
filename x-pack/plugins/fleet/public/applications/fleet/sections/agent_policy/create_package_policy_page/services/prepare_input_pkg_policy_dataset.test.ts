/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy } from '../../../../types';

import { prepareInputPackagePolicyDataset } from './prepare_input_pkg_policy_dataset';
const customLogsPackagePolicyWithDataset = (
  datasetValue:
    | {
        dataset: string;
        package: string;
      }
    | string
) => ({
  name: 'custom_logs-1',
  description: '',
  namespace: 'default',
  policy_id: '05034740-9285-11ed-87a3-4ff599bc9864',
  policy_ids: ['05034740-9285-11ed-87a3-4ff599bc9864'],
  enabled: true,
  inputs: [
    {
      type: 'logfile',
      policy_template: 'first_policy_template',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: {
            type: 'logs',
            dataset: 'custom_logs.first_policy_template',
          },
          vars: {
            paths: {
              type: 'text',
              value: ['/tmp/test.log'],
            },
            tags: {
              type: 'text',
              value: ['tag1'],
            },
            ignore_older: {
              value: '72h',
              type: 'text',
            },
            'data_stream.dataset': {
              type: 'text',
              value: datasetValue,
            },
          },
        },
      ],
    },
  ],
  package: {
    name: 'custom_logs',
    title: 'Custom Logs',
    version: '1.1.0',
    experimental_data_stream_features: [],
  },
});

const expectDatasetVarToEqual = (policy: NewPackagePolicy, expected: any) =>
  expect(policy?.inputs?.[0]?.streams?.[0]?.vars?.['data_stream.dataset']?.value).toEqual(expected);

describe('prepareInputPackagePolicyDataset', function () {
  it('should do nothing if dataset value is not an object', function () {
    const newPolicy = customLogsPackagePolicyWithDataset('generic');
    const result = prepareInputPackagePolicyDataset(newPolicy);
    expect(result.forceCreateNeeded).toEqual(false);
    expect(result.policy).toEqual(newPolicy);
  });
  it('should do nothing if no inputs', function () {
    const newPolicy = customLogsPackagePolicyWithDataset('generic');
    newPolicy.inputs = [];
    const result = prepareInputPackagePolicyDataset(newPolicy);
    expect(result.forceCreateNeeded).toEqual(false);
    expect(result.policy).toEqual(newPolicy);
  });
  it('should not force create if dataset from same package', function () {
    const newPolicy = customLogsPackagePolicyWithDataset({
      dataset: 'generic',
      package: 'custom_logs',
    });
    const result = prepareInputPackagePolicyDataset(newPolicy);
    expect(result.forceCreateNeeded).toEqual(false);
    expectDatasetVarToEqual(result.policy, 'generic');
  });
  it('should force create if dataset from different package', function () {
    const newPolicy = customLogsPackagePolicyWithDataset({
      dataset: 'generic',
      package: 'not_custom_logs',
    });
    const result = prepareInputPackagePolicyDataset(newPolicy);
    expect(result.forceCreateNeeded).toEqual(true);
    expectDatasetVarToEqual(result.policy, 'generic');
  });
});
