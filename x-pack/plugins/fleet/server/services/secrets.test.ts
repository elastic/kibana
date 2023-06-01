/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2[0].
 */

import type { NewPackagePolicy, PackageInfo } from '../types';

import { getPolicySecretPaths, diffSecretPaths } from './secrets';

describe('getPolicySecretPaths', () => {
  describe('integration package with one policy template', () => {
    const mockIntegrationPackage = {
      name: 'mock-package',
      title: 'Mock package',
      version: '0[0].0',
      description: 'description',
      type: 'integration',
      status: 'not_installed',
      vars: [
        { name: 'pkg-secret-1', type: 'text', secret: true },
        { name: 'pkg-secret-2', type: 'text', secret: true },
      ],
      data_streams: [
        {
          dataset: 'somedataset',
          streams: [
            {
              input: 'foo',
              title: 'Foo',
              vars: [
                { name: 'stream-secret-1', type: 'text', secret: true },
                { name: 'stream-secret-2', type: 'text', secret: true },
              ],
            },
          ],
        },
      ],
      policy_templates: [
        {
          name: 'pkgPolicy1',
          title: 'Package policy 1',
          description: 'test package policy',
          inputs: [
            {
              type: 'foo',
              title: 'Foo',
              vars: [
                { default: 'foo-input-var-value', name: 'foo-input-var-name', type: 'text' },
                {
                  name: 'input-secret-1',
                  type: 'text',
                  secret: true,
                },
                {
                  name: 'input-secret-2',
                  type: 'text',
                  secret: true,
                },
                { name: 'foo-input3-var-name', type: 'text', multi: true },
              ],
            },
          ],
        },
      ],
    } as unknown as PackageInfo;
    it('policy with package level secret vars', () => {
      const packagePolicy = {
        vars: {
          'pkg-secret-1': {
            value: 'pkg-secret-1-val',
          },
          'pkg-secret-2': {
            value: 'pkg-secret-2-val',
          },
        },
        inputs: [],
      } as unknown as NewPackagePolicy;

      expect(getPolicySecretPaths(packagePolicy, mockIntegrationPackage)).toEqual([
        {
          path: 'vars.pkg-secret-1',
          value: {
            value: 'pkg-secret-1-val',
          },
        },
        {
          path: 'vars.pkg-secret-2',
          value: {
            value: 'pkg-secret-2-val',
          },
        },
      ]);
    });
    it('policy with package level secret vars and only one set', () => {
      const packagePolicy = {
        vars: {
          'pkg-secret-1': {
            value: 'pkg-secret-1-val',
          },
        },
        inputs: [],
      } as unknown as NewPackagePolicy;

      expect(getPolicySecretPaths(packagePolicy, mockIntegrationPackage)).toEqual([
        {
          path: 'vars.pkg-secret-1',
          value: {
            value: 'pkg-secret-1-val',
          },
        },
      ]);
    });
    it('policy with input level secret vars', () => {
      const packagePolicy = {
        inputs: [
          {
            type: 'foo',
            policy_template: 'pkgPolicy1',
            vars: {
              'input-secret-1': {
                value: 'input-secret-1-val',
              },
              'input-secret-2': {
                value: 'input-secret-2-val',
              },
            },
            streams: [],
          },
        ],
      } as unknown as NewPackagePolicy;

      expect(getPolicySecretPaths(packagePolicy, mockIntegrationPackage)).toEqual([
        {
          path: 'inputs[0].vars.input-secret-1',
          value: { value: 'input-secret-1-val' },
        },
        {
          path: 'inputs[0].vars.input-secret-2',
          value: { value: 'input-secret-2-val' },
        },
      ]);
    });
    it('stream level secret vars', () => {
      const packagePolicy = {
        inputs: [
          {
            type: 'foo',
            policy_template: 'pkgPolicy1',
            streams: [
              {
                data_stream: {
                  dataset: 'somedataset',
                  type: 'logs',
                },
                vars: {
                  'stream-secret-1': {
                    value: 'stream-secret-1-value',
                  },
                  'stream-secret-2': {
                    value: 'stream-secret-2-value',
                  },
                },
              },
            ],
          },
        ],
      } as unknown as NewPackagePolicy;

      expect(getPolicySecretPaths(packagePolicy, mockIntegrationPackage)).toEqual([
        {
          path: 'inputs[0].streams[0].vars.stream-secret-1',
          value: { value: 'stream-secret-1-value' },
        },
        {
          path: 'inputs[0].streams[0].vars.stream-secret-2',
          value: { value: 'stream-secret-2-value' },
        },
      ]);
    });
  });

  describe('integration package with multiple policy templates (e.g AWS)', () => {
    const miniAWsPackage = {
      name: 'aws',
      title: 'AWS',
      version: '0.5.3',
      release: 'beta',
      description: 'AWS Integration',
      type: 'integration',
      policy_templates: [
        {
          name: 'billing',
          title: 'AWS Billing',
          description: 'Collect AWS billing metrics',
          data_streams: ['billing'],
          inputs: [
            {
              type: 'aws/metrics',
              title: 'Collect billing metrics',
              description: 'Collect billing metrics',
              input_group: 'metrics',
              vars: [
                {
                  name: 'password',
                  type: 'text',
                  secret: true,
                },
              ],
            },
          ],
        },
        {
          name: 'cloudtrail',
          title: 'AWS Cloudtrail',
          description: 'Collect logs from AWS Cloudtrail',
          data_streams: ['cloudtrail'],
          inputs: [
            {
              type: 's3',
              title: 'Collect logs from Cloudtrail service',
              description: 'Collecting Cloudtrail logs using S3 input',
              input_group: 'logs',
              vars: [
                {
                  name: 'password',
                  type: 'text',
                  secret: true,
                },
              ],
            },
            {
              type: 'httpjson',
              title: 'Collect logs from third-party REST API (experimental)',
              description: 'Collect logs from third-party REST API (experimental)',
              input_group: 'logs',
              vars: [
                {
                  name: 'password',
                  type: 'text',
                  secret: true,
                },
              ],
            },
          ],
        },
      ],
      vars: [
        {
          name: 'secret_access_key',
          type: 'text',
          title: 'Secret Access Key',
          multi: false,
          required: false,
          show_user: false,
          secret: true,
        },
      ],
      data_streams: [
        {
          type: 'metrics',
          dataset: 'aws.billing',
          title: 'AWS billing metrics',
          release: 'beta',
          streams: [
            {
              input: 'aws/metrics',
              vars: [
                {
                  name: 'password',
                  type: 'text',
                  secret: true,
                },
              ],
              template_path: 'stream.yml.hbs',
              title: 'AWS Billing metrics',
              description: 'Collect AWS billing metrics',
              enabled: true,
            },
          ],
          package: 'aws',
          path: 'billing',
        },
        {
          type: 'logs',
          dataset: 'aws.cloudtrail',
          title: 'AWS CloudTrail logs',
          release: 'beta',
          ingest_pipeline: 'default',
          streams: [
            {
              input: 's3',
              vars: [
                {
                  name: 'password',
                  type: 'text',
                  secret: true,
                },
              ],
              template_path: 's3.yml.hbs',
            },
            {
              input: 'httpjson',
              vars: [
                {
                  name: 'username',
                  type: 'text',
                  title: 'Splunk REST API Username',
                  multi: false,
                  required: true,
                  show_user: true,
                },
                {
                  name: 'password',
                  type: 'password',
                  title: 'Splunk REST API Password',
                  multi: false,
                  required: true,
                  show_user: true,
                  secret: true,
                },
              ],
              template_path: 'httpjson.yml.hbs',
            },
          ],
          package: 'aws',
          path: 'cloudtrail',
        },
      ],
    } as PackageInfo;
    it('single policy with package + input + stream level secret var', () => {
      const policy = {
        vars: {
          secret_access_key: {
            value: 'my_secret_access_key',
          },
        },
        inputs: [
          {
            type: 'aws/metrics',
            policy_template: 'billing',
            enabled: true,
            vars: {
              password: { value: 'billing_input_password', type: 'text' },
            },
            streams: [
              {
                enabled: true,
                data_stream: { type: 'metrics', dataset: 'aws.billing' },
                vars: {
                  password: { value: 'billing_stream_password', type: 'text' },
                },
              },
            ],
          },
        ],
      };
      expect(
        getPolicySecretPaths(
          policy as unknown as NewPackagePolicy,
          miniAWsPackage as unknown as PackageInfo
        )
      ).toEqual([
        {
          path: 'vars.secret_access_key',
          value: {
            value: 'my_secret_access_key',
          },
        },
        {
          path: 'inputs[0].vars.password',
          value: {
            type: 'text',
            value: 'billing_input_password',
          },
        },
        {
          path: 'inputs[0].streams[0].vars.password',
          value: {
            type: 'text',
            value: 'billing_stream_password',
          },
        },
      ]);
    });
    it('double policy with package + input + stream level secret var', () => {
      const policy = {
        vars: {
          secret_access_key: {
            value: 'my_secret_access_key',
          },
        },
        inputs: [
          {
            type: 'httpjson',
            policy_template: 'cloudtrail',
            enabled: false,
            vars: {
              password: { value: 'cloudtrail_httpjson_input_password' },
            },
            streams: [
              {
                data_stream: { type: 'logs', dataset: 'aws.cloudtrail' },
                vars: {
                  username: { value: 'hop_dev' },
                  password: { value: 'cloudtrail_httpjson_stream_password' },
                },
              },
            ],
          },
          {
            type: 's3',
            policy_template: 'cloudtrail',
            enabled: true,
            vars: {
              password: { value: 'cloudtrail_s3_input_password' },
            },
            streams: [
              {
                enabled: true,
                data_stream: { type: 'logs', dataset: 'aws.cloudtrail' },
                vars: {
                  password: { value: 'cloudtrail_s3_stream_password' },
                },
              },
            ],
          },
        ],
      };

      expect(
        getPolicySecretPaths(
          policy as unknown as NewPackagePolicy,
          miniAWsPackage as unknown as PackageInfo
        )
      ).toEqual([
        {
          path: 'vars.secret_access_key',
          value: {
            value: 'my_secret_access_key',
          },
        },
        {
          path: 'inputs[0].vars.password',
          value: {
            value: 'cloudtrail_httpjson_input_password',
          },
        },
        {
          path: 'inputs[0].streams[0].vars.password',
          value: {
            value: 'cloudtrail_httpjson_stream_password',
          },
        },
        {
          path: 'inputs[1].vars.password',
          value: {
            value: 'cloudtrail_s3_input_password',
          },
        },
        {
          path: 'inputs[1].streams[0].vars.password',
          value: {
            value: 'cloudtrail_s3_stream_password',
          },
        },
      ]);
    });
  });

  describe('input package', () => {
    const mockInputPackage = {
      name: 'log',
      version: '2.0.0',
      description: 'Collect custom logs with Elastic Agent.',
      title: 'Custom Logs',
      format_version: '2.6.0',
      owner: {
        github: 'elastic/elastic-agent-data-plane',
      },
      type: 'input',
      categories: ['custom', 'custom_logs'],
      conditions: {},
      icons: [],
      policy_templates: [
        {
          name: 'logs',
          title: 'Custom log file',
          description: 'Collect your custom log files.',
          multiple: true,
          input: 'logfile',
          type: 'logs',
          template_path: 'input.yml.hbs',
          vars: [
            {
              name: 'paths',
              required: true,
              title: 'Log file path',
              description: 'Path to log files to be collected',
              type: 'text',
              multi: true,
            },
            {
              name: 'data_stream.dataset',
              required: true,
              title: 'Dataset name',
              description:
                "Set the name for your dataset. Changing the dataset will send the data to a different index. You can't use `-` in the name of a dataset and only valid characters for [Elasticsearch index names](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-index_.html).\n",
              type: 'text',
            },
            {
              name: 'secret-1',
              type: 'text',
              secret: true,
            },
            {
              name: 'secret-2',
              type: 'text',
              secret: true,
            },
          ],
        },
      ],
    };
    it('template level vars', () => {
      const policy = {
        inputs: [
          {
            type: 'logfile',
            policy_template: 'logs',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: {
                  type: 'logs',
                  dataset: 'log.logs',
                },
                vars: {
                  paths: {
                    value: ['/tmp/test.log'],
                  },
                  'data_stream.dataset': {
                    value: 'hello',
                  },
                  'secret-1': {
                    value: 'secret-1-value',
                  },
                  'secret-2': {
                    value: 'secret-2-value',
                  },
                },
              },
            ],
          },
        ],
      };

      expect(
        getPolicySecretPaths(
          policy as unknown as NewPackagePolicy,
          mockInputPackage as unknown as PackageInfo
        )
      ).toEqual([
        {
          path: 'inputs[0].streams[0].vars.secret-1',
          value: {
            value: 'secret-1-value',
          },
        },
        {
          path: 'inputs[0].streams[0].vars.secret-2',
          value: {
            value: 'secret-2-value',
          },
        },
      ]);
    });
  });
});

describe('diffSecretPaths', () => {
  it('should return empty array if no secrets', () => {
    expect(diffSecretPaths([], [])).toEqual({
      toCreate: [],
      toDelete: [],
      noChange: [],
    });
  });
  it('should return empty array if single secret not changed', () => {
    const paths = [
      {
        path: 'somepath',
        value: {
          value: {
            isSecretRef: true,
            id: 'secret-1',
          },
        },
      },
    ];
    expect(diffSecretPaths(paths, paths)).toEqual({
      toCreate: [],
      toDelete: [],
      noChange: paths,
    });
  });
  it('should return empty array if multiple secrets not changed', () => {
    const paths = [
      {
        path: 'somepath',
        value: {
          value: {
            isSecretRef: true,
            id: 'secret-1',
          },
        },
      },
      {
        path: 'somepath2',
        value: {
          value: {
            isSecretRef: true,
            id: 'secret-2',
          },
        },
      },
      {
        path: 'somepath3',
        value: {
          value: {
            isSecretRef: true,
            id: 'secret-3',
          },
        },
      },
    ];

    expect(diffSecretPaths(paths, paths.slice().reverse())).toEqual({
      toCreate: [],
      toDelete: [],
      noChange: paths,
    });
  });
  it('single secret modified', () => {
    const paths1 = [
      {
        path: 'somepath1',
        value: {
          value: {
            isSecretRef: true,
            id: 'secret-1',
          },
        },
      },
      {
        path: 'somepath2',
        value: {
          value: { isSecretRef: true, id: 'secret-2' },
        },
      },
    ];

    const paths2 = [
      paths1[0],
      {
        path: 'somepath2',
        value: { value: 'newvalue' },
      },
    ];

    expect(diffSecretPaths(paths1, paths2)).toEqual({
      toCreate: [
        {
          path: 'somepath2',
          value: { value: 'newvalue' },
        },
      ],
      toDelete: [
        {
          path: 'somepath2',
          value: {
            value: {
              isSecretRef: true,
              id: 'secret-2',
            },
          },
        },
      ],
      noChange: [paths1[0]],
    });
  });
  it('double secret modified', () => {
    const paths1 = [
      {
        path: 'somepath1',
        value: {
          value: {
            isSecretRef: true,
            id: 'secret-1',
          },
        },
      },
      {
        path: 'somepath2',
        value: {
          value: {
            isSecretRef: true,
            id: 'secret-2',
          },
        },
      },
    ];

    const paths2 = [
      {
        path: 'somepath1',
        value: { value: 'newvalue1' },
      },
      {
        path: 'somepath2',
        value: { value: 'newvalue2' },
      },
    ];

    expect(diffSecretPaths(paths1, paths2)).toEqual({
      toCreate: [
        {
          path: 'somepath1',
          value: { value: 'newvalue1' },
        },
        {
          path: 'somepath2',
          value: { value: 'newvalue2' },
        },
      ],
      toDelete: [
        {
          path: 'somepath1',
          value: {
            value: {
              isSecretRef: true,
              id: 'secret-1',
            },
          },
        },
        {
          path: 'somepath2',
          value: {
            value: {
              isSecretRef: true,
              id: 'secret-2',
            },
          },
        },
      ],
      noChange: [],
    });
  });

  it('single secret added', () => {
    const paths1 = [
      {
        path: 'somepath1',
        value: {
          value: {
            isSecretRef: true,
            id: 'secret-1',
          },
        },
      },
    ];

    const paths2 = [
      paths1[0],
      {
        path: 'somepath2',
        value: { value: 'newvalue' },
      },
    ];

    expect(diffSecretPaths(paths1, paths2)).toEqual({
      toCreate: [
        {
          path: 'somepath2',
          value: { value: 'newvalue' },
        },
      ],
      toDelete: [],
      noChange: [paths1[0]],
    });
  });
});
