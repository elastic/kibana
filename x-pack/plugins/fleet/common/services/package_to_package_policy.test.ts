/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '../types';

import { packageToPackagePolicy, packageToPackagePolicyInputs } from './package_to_package_policy';

describe('Fleet - packageToPackagePolicy', () => {
  const mockPackage: PackageInfo = {
    name: 'mock-package',
    title: 'Mock package',
    version: '0.0.0',
    latestVersion: '0.0.0',
    description: 'description',
    type: 'integration',
    categories: [],
    conditions: { kibana: { version: '' } },
    format_version: '',
    download: '',
    path: '',
    assets: {
      kibana: {
        dashboard: [],
        visualization: [],
        search: [],
        index_pattern: [],
        map: [],
        lens: [],
        ml_module: [],
      },
      elasticsearch: {
        ingest_pipeline: [],
        component_template: [],
        index_template: [],
        transform: [],
        ilm_policy: [],
        data_stream_ilm_policy: [],
      },
    },
    status: 'not_installed',
    release: 'experimental',
    owner: {
      github: 'elastic/fleet',
    },
  };

  describe('packageToPackagePolicyInputs', () => {
    it('returns empty array for packages with no config templates', () => {
      expect(packageToPackagePolicyInputs(mockPackage)).toEqual([]);
      expect(packageToPackagePolicyInputs({ ...mockPackage, policy_templates: [] })).toEqual([]);
    });

    it('returns empty array for packages with a config template but no inputs', () => {
      expect(
        packageToPackagePolicyInputs(({
          ...mockPackage,
          policy_templates: [{ inputs: [] }],
        } as unknown) as PackageInfo)
      ).toEqual([]);
    });

    it('returns inputs with no streams for packages with no streams', () => {
      expect(
        packageToPackagePolicyInputs(({
          ...mockPackage,
          policy_templates: [{ inputs: [{ type: 'foo' }] }],
        } as unknown) as PackageInfo)
      ).toEqual([{ type: 'foo', enabled: true, streams: [] }]);
      expect(
        packageToPackagePolicyInputs(({
          ...mockPackage,
          policy_templates: [{ inputs: [{ type: 'foo' }, { type: 'bar' }] }],
        } as unknown) as PackageInfo)
      ).toEqual([
        { type: 'foo', enabled: true, streams: [] },
        { type: 'bar', enabled: true, streams: [] },
      ]);
    });

    it('returns inputs with streams for packages with streams', () => {
      expect(
        packageToPackagePolicyInputs(({
          ...mockPackage,
          data_streams: [
            { type: 'logs', dataset: 'foo', streams: [{ input: 'foo' }] },
            { type: 'logs', dataset: 'bar', streams: [{ input: 'bar' }] },
            { type: 'logs', dataset: 'bar2', streams: [{ input: 'bar' }] },
          ],
          policy_templates: [
            {
              inputs: [{ type: 'foo' }, { type: 'bar' }],
            },
          ],
        } as unknown) as PackageInfo)
      ).toEqual([
        {
          type: 'foo',
          enabled: true,
          streams: [{ enabled: true, data_stream: { dataset: 'foo', type: 'logs' } }],
        },
        {
          type: 'bar',
          enabled: true,
          streams: [
            { enabled: true, data_stream: { dataset: 'bar', type: 'logs' } },
            { enabled: true, data_stream: { dataset: 'bar2', type: 'logs' } },
          ],
        },
      ]);
    });

    it('returns inputs with streams configurations for packages with stream vars', () => {
      expect(
        packageToPackagePolicyInputs(({
          ...mockPackage,
          data_streams: [
            {
              type: 'logs',
              dataset: 'foo',
              streams: [{ input: 'foo', vars: [{ default: 'foo-var-value', name: 'var-name' }] }],
            },
            {
              type: 'logs',
              dataset: 'bar',
              streams: [
                {
                  input: 'bar',
                  vars: [{ default: 'bar-var-value', name: 'var-name', type: 'text' }],
                },
              ],
            },
            {
              type: 'logs',
              dataset: 'bar2',
              streams: [
                {
                  input: 'bar',
                  vars: [{ default: 'bar2-var-value', name: 'var-name', type: 'yaml' }],
                },
              ],
            },
          ],
          policy_templates: [
            {
              inputs: [{ type: 'foo' }, { type: 'bar' }],
            },
          ],
        } as unknown) as PackageInfo)
      ).toEqual([
        {
          type: 'foo',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { dataset: 'foo', type: 'logs' },
              vars: { 'var-name': { value: 'foo-var-value' } },
            },
          ],
        },
        {
          type: 'bar',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { dataset: 'bar', type: 'logs' },
              vars: { 'var-name': { type: 'text', value: 'bar-var-value' } },
            },
            {
              enabled: true,
              data_stream: { dataset: 'bar2', type: 'logs' },
              vars: { 'var-name': { type: 'yaml', value: 'bar2-var-value' } },
            },
          ],
        },
      ]);
    });

    it('returns inputs with streams configurations for packages with stream and input vars', () => {
      expect(
        packageToPackagePolicyInputs(({
          ...mockPackage,
          data_streams: [
            {
              type: 'logs',
              dataset: 'foo',
              streams: [{ input: 'foo', vars: [{ default: 'foo-var-value', name: 'var-name' }] }],
            },
            {
              type: 'logs',
              dataset: 'bar',
              streams: [
                {
                  input: 'bar',
                  vars: [{ default: 'bar-var-value', name: 'var-name' }],
                },
              ],
            },
            {
              type: 'logs',
              dataset: 'bar2',
              streams: [
                {
                  input: 'bar',
                  vars: [{ default: 'bar2-var-value', name: 'var-name' }],
                },
              ],
            },
            {
              type: 'logs',
              dataset: 'disabled',
              streams: [
                {
                  input: 'with-disabled-streams',
                  enabled: false,
                  vars: [{ multi: true, name: 'var-name' }],
                },
              ],
            },
            {
              type: 'logs',
              dataset: 'disabled2',
              streams: [
                {
                  input: 'with-disabled-streams',
                  enabled: false,
                },
              ],
            },
          ],
          policy_templates: [
            {
              inputs: [
                {
                  type: 'foo',
                  vars: [
                    { default: 'foo-input-var-value', name: 'foo-input-var-name' },
                    { default: 'foo-input2-var-value', name: 'foo-input2-var-name' },
                    { name: 'foo-input3-var-name' },
                  ],
                },
                {
                  type: 'bar',
                  vars: [
                    { default: ['value1', 'value2'], name: 'bar-input-var-name' },
                    { default: 123456, name: 'bar-input2-var-name' },
                  ],
                },
                {
                  type: 'with-disabled-streams',
                },
              ],
            },
          ],
        } as unknown) as PackageInfo)
      ).toEqual([
        {
          type: 'foo',
          enabled: true,
          vars: {
            'foo-input-var-name': { value: 'foo-input-var-value' },
            'foo-input2-var-name': { value: 'foo-input2-var-value' },
            'foo-input3-var-name': { value: undefined },
          },
          streams: [
            {
              enabled: true,
              data_stream: { dataset: 'foo', type: 'logs' },
              vars: {
                'var-name': { value: 'foo-var-value' },
              },
            },
          ],
        },
        {
          type: 'bar',
          enabled: true,
          vars: {
            'bar-input-var-name': { value: ['value1', 'value2'] },
            'bar-input2-var-name': { value: 123456 },
          },
          streams: [
            {
              enabled: true,
              data_stream: { dataset: 'bar', type: 'logs' },
              vars: {
                'var-name': { value: 'bar-var-value' },
              },
            },
            {
              enabled: true,
              data_stream: { dataset: 'bar2', type: 'logs' },
              vars: {
                'var-name': { value: 'bar2-var-value' },
              },
            },
          ],
        },
        {
          type: 'with-disabled-streams',
          enabled: false,
          streams: [
            {
              enabled: false,
              data_stream: { dataset: 'disabled', type: 'logs' },
              vars: {
                'var-name': { value: [] },
              },
            },
            {
              enabled: false,
              data_stream: { dataset: 'disabled2', type: 'logs' },
            },
          ],
        },
      ]);
    });
  });

  describe('packageToPackagePolicy', () => {
    it('returns package policy with default name', () => {
      expect(packageToPackagePolicy(mockPackage, '1', '2')).toEqual({
        policy_id: '1',
        namespace: '',
        enabled: true,
        inputs: [],
        name: 'mock-package-1',
        output_id: '2',
        package: {
          name: 'mock-package',
          title: 'Mock package',
          version: '0.0.0',
        },
      });
    });

    it('returns package policy with custom name', () => {
      expect(packageToPackagePolicy(mockPackage, '1', '2', 'default', 'pkgPolicy-1')).toEqual({
        policy_id: '1',
        namespace: 'default',
        enabled: true,
        inputs: [],
        name: 'pkgPolicy-1',
        output_id: '2',
        package: {
          name: 'mock-package',
          title: 'Mock package',
          version: '0.0.0',
        },
      });
    });

    it('returns package policy with namespace and description', () => {
      expect(
        packageToPackagePolicy(
          mockPackage,
          '1',
          '2',
          'mock-namespace',
          'pkgPolicy-1',
          'Test description'
        )
      ).toEqual({
        policy_id: '1',
        enabled: true,
        inputs: [],
        name: 'pkgPolicy-1',
        namespace: 'mock-namespace',
        description: 'Test description',
        output_id: '2',
        package: {
          name: 'mock-package',
          title: 'Mock package',
          version: '0.0.0',
        },
      });
    });

    it('returns package policy with inputs and package-level vars', () => {
      const mockPackageWithPolicyTemplates = ({
        ...mockPackage,
        policy_templates: [{ inputs: [{ type: 'foo' }] }],
        vars: [{ default: 'foo-var-value', name: 'var-name', type: 'text' }],
      } as unknown) as PackageInfo;

      expect(
        packageToPackagePolicy(mockPackageWithPolicyTemplates, '1', '2', 'default', 'pkgPolicy-1')
      ).toEqual({
        policy_id: '1',
        namespace: 'default',
        enabled: true,
        name: 'pkgPolicy-1',
        output_id: '2',
        package: {
          name: 'mock-package',
          title: 'Mock package',
          version: '0.0.0',
        },
        inputs: [{ type: 'foo', enabled: true, streams: [] }],
        vars: { 'var-name': { value: 'foo-var-value', type: 'text' } },
      });
    });

    it('returns package policy with multiple policy templates correctly', () => {
      const mockPackageWithPolicyTemplates = ({
        ...mockPackage,
        data_streams: [
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
                    name: 'queue_url',
                    type: 'text',
                    title: 'Queue URL',
                    description: 'URL of the AWS SQS queue that messages will be received from.',
                    multi: false,
                    required: true,
                    show_user: true,
                  },
                  {
                    name: 'fips_enabled',
                    type: 'bool',
                    title: 'Enable S3 FIPS',
                    description:
                      'Enabling this option changes the service name from `s3` to `s3-fips` for connecting to the correct service endpoint.',
                    multi: false,
                    required: false,
                    show_user: false,
                    default: false,
                  },
                ],
                template_path: 's3.yml.hbs',
                title: 'AWS CloudTrail logs',
                description: 'Collect AWS CloudTrail logs using s3 input',
                enabled: true,
              },
              {
                input: 'httpjson',
                vars: [
                  {
                    name: 'interval',
                    type: 'text',
                    title: 'Interval to query Splunk Enterprise REST API',
                    description: 'Go Duration syntax (eg. 10s)',
                    multi: false,
                    required: true,
                    show_user: true,
                    default: '10s',
                  },
                  {
                    name: 'search',
                    type: 'text',
                    title: 'Splunk search string',
                    multi: false,
                    required: true,
                    show_user: true,
                    default: 'search sourcetype=aws:cloudtrail',
                  },
                  {
                    name: 'tags',
                    type: 'text',
                    title: 'Tags',
                    multi: true,
                    required: false,
                    show_user: false,
                    default: ['forwarded'],
                  },
                ],
                template_path: 'httpjson.yml.hbs',
                title: 'AWS CloudTrail logs via Splunk Enterprise REST API',
                description: 'Collect AWS CloudTrail logs via Splunk Enterprise REST API',
                enabled: false,
              },
            ],
            package: 'aws',
            path: 'cloudtrail',
          },
          {
            type: 'logs',
            dataset: 'aws.cloudwatch_logs',
            title: 'AWS CloudWatch logs',
            release: 'beta',
            ingest_pipeline: 'default',
            streams: [
              {
                input: 's3',
                vars: [
                  {
                    name: 'queue_url',
                    type: 'text',
                    title: 'Queue URL',
                    description: 'URL of the AWS SQS queue that messages will be received from.',
                    multi: false,
                    required: true,
                    show_user: true,
                  },
                  {
                    name: 'fips_enabled',
                    type: 'bool',
                    title: 'Enable S3 FIPS',
                    description:
                      'Enabling this option changes the service name from `s3` to `s3-fips` for connecting to the correct service endpoint.',
                    multi: false,
                    required: false,
                    show_user: false,
                    default: false,
                  },
                ],
                template_path: 's3.yml.hbs',
                title: 'AWS CloudWatch logs',
                description: 'Collect AWS CloudWatch logs using s3 input',
                enabled: true,
              },
            ],
            package: 'aws',
            path: 'cloudwatch_logs',
          },
          {
            type: 'metrics',
            dataset: 'aws.cloudwatch_metrics',
            title: 'AWS CloudWatch metrics',
            release: 'beta',
            streams: [
              {
                input: 'aws/metrics',
                vars: [
                  {
                    name: 'period',
                    type: 'text',
                    title: 'Period',
                    multi: false,
                    required: true,
                    show_user: true,
                    default: '300s',
                  },
                  {
                    name: 'regions',
                    type: 'text',
                    title: 'Regions',
                    multi: true,
                    required: false,
                    show_user: true,
                  },
                  {
                    name: 'latency',
                    type: 'text',
                    title: 'Latency',
                    multi: false,
                    required: false,
                    show_user: false,
                  },
                  {
                    name: 'metrics',
                    type: 'yaml',
                    title: 'Metrics',
                    multi: false,
                    required: true,
                    show_user: true,
                    default:
                      '- namespace: AWS/EC2\n  resource_type: ec2:instance\n  name:\n    - CPUUtilization\n    - DiskWriteOps\n  statistic:\n    - Average\n    - Maximum\n  # dimensions:\n   # - name: InstanceId\n      # value: i-123456\n  # tags:\n    # - key: created-by\n      # value: foo\n',
                  },
                ],
                template_path: 'stream.yml.hbs',
                title: 'AWS CloudWatch metrics',
                description: 'Collect AWS CloudWatch metrics',
                enabled: true,
              },
            ],
            package: 'aws',
            path: 'cloudwatch_metrics',
          },
        ],
        policy_templates: [
          {
            name: 'cloudtrail',
            title: 'AWS Cloudtrail',
            description: 'Collect logs from AWS Cloudtrail',
            data_streams: ['cloudtrail'],
            inputs: [
              {
                type: 's3',
                vars: [
                  {
                    name: 'visibility_timeout',
                    type: 'text',
                    title: 'Visibility Timeout',
                    description:
                      'The duration that the received messages are hidden from subsequent retrieve requests after being retrieved by a ReceiveMessage request.  The maximum is 12 hours.',
                    multi: false,
                    required: false,
                    show_user: false,
                  },
                  {
                    name: 'api_timeout',
                    type: 'text',
                    title: 'API Timeout',
                    description:
                      'The maximum duration of AWS API can take. The maximum is half of the visibility timeout value.',
                    multi: false,
                    required: false,
                    show_user: false,
                  },
                ],
                title: 'Collect logs from Cloudtrail service',
                description: 'Collecting Cloudtrail logs using S3 input',
                input_group: 'logs',
              },
            ],
            multiple: true,
            icons: [
              {
                src: '/img/logo_cloudtrail.svg',
                path: '/package/aws/0.5.2/img/logo_cloudtrail.svg',
                title: 'AWS Cloudtrail logo',
                size: '32x32',
                type: 'image/svg+xml',
              },
            ],
            screenshots: [
              {
                src: '/img/filebeat-aws-cloudtrail.png',
                path: '/package/aws/0.5.2/img/filebeat-aws-cloudtrail.png',
                title: 'filebeat aws cloudtrail',
                size: '1702x1063',
                type: 'image/png',
              },
            ],
          },
          {
            name: 'cloudwatch',
            title: 'AWS CloudWatch',
            description: 'Collect logs and metrics from CloudWatch',
            data_streams: ['cloudwatch_logs', 'cloudwatch_metrics'],
            inputs: [
              {
                type: 's3',
                vars: [
                  {
                    name: 'visibility_timeout',
                    type: 'text',
                    title: 'Visibility Timeout',
                    description:
                      'The duration that the received messages are hidden from subsequent retrieve requests after being retrieved by a ReceiveMessage request.  The maximum is 12 hours.',
                    multi: false,
                    required: false,
                    show_user: false,
                  },
                  {
                    name: 'api_timeout',
                    type: 'text',
                    title: 'API Timeout',
                    description:
                      'The maximum duration of AWS API can take. The maximum is half of the visibility timeout value.',
                    multi: false,
                    required: false,
                    show_user: false,
                  },
                ],
                title: 'Collect logs from CloudWatch',
                description: 'Collecting logs from CloudWatch using S3 input',
                input_group: 'logs',
              },
              {
                type: 'aws/metrics',
                vars: [
                  {
                    name: 'metrics',
                    type: 'yaml',
                    title: 'Metrics',
                    multi: false,
                    required: true,
                    show_user: true,
                    default:
                      '- namespace: AWS/EC2\n  resource_type: ec2:instance\n  name:\n    - CPUUtilization\n    - DiskWriteOps\n  statistic:\n    - Average\n    - Maximum\n  # dimensions:\n   # - name: InstanceId\n      # value: i-123456\n  # tags:\n    # - key: created-by\n      # value: foo\n',
                  },
                ],
                title: 'Collect metrics from CloudWatch',
                description: 'Collecting metrics from AWS CloudWatch',
                input_group: 'metrics',
              },
            ],
            multiple: true,
            icons: [
              {
                src: '/img/logo_cloudwatch.svg',
                path: '/package/aws/0.5.2/img/logo_cloudwatch.svg',
                title: 'AWS CloudWatch logo',
                size: '32x32',
                type: 'image/svg+xml',
              },
            ],
          },
        ],
        vars: [
          {
            name: 'shared_credential_file',
            type: 'text',
            title: 'Shared Credential File',
            description: 'Directory of the shared credentials file.',
            multi: false,
            required: false,
            show_user: false,
          },
          {
            name: 'credential_profile_name',
            type: 'text',
            title: 'Credential Profile Name',
            multi: false,
            required: false,
            show_user: true,
          },
          {
            name: 'access_key_id',
            type: 'text',
            title: 'Access Key ID',
            multi: false,
            required: false,
            show_user: false,
          },
          {
            name: 'secret_access_key',
            type: 'text',
            title: 'Secret Access Key',
            multi: false,
            required: false,
            show_user: false,
          },
          {
            name: 'session_token',
            type: 'text',
            title: 'Session Token',
            multi: false,
            required: false,
            show_user: false,
          },
          {
            name: 'role_arn',
            type: 'text',
            title: 'Role ARN',
            multi: false,
            required: false,
            show_user: false,
          },
          {
            name: 'endpoint',
            type: 'text',
            title: 'Endpoint',
            description: 'URL of the entry point for an AWS web service.',
            multi: false,
            required: false,
            show_user: false,
            default: 'amazonaws.com',
          },
        ],
      } as unknown) as PackageInfo;

      expect(
        packageToPackagePolicy(
          mockPackageWithPolicyTemplates,
          'some-policy-id',
          'some-output-id',
          'default'
        )
      ).toEqual({
        name: 'mock-package-1',
        namespace: 'default',
        package: { name: 'mock-package', title: 'Mock package', version: '0.0.0' },
        enabled: true,
        policy_id: 'some-policy-id',
        output_id: 'some-output-id',
        inputs: [
          {
            type: 'cloudtrail',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { type: 'logs', dataset: 'aws.cloudtrail' },
                vars: {
                  queue_url: { type: 'text' },
                  fips_enabled: { value: false, type: 'bool' },
                  visibility_timeout: { type: 'text' },
                  api_timeout: { type: 'text' },
                },
              },
            ],
          },
          {
            type: 'cloudwatch',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { type: 'logs', dataset: 'aws.cloudwatch_logs' },
                vars: {
                  queue_url: { type: 'text' },
                  fips_enabled: { value: false, type: 'bool' },
                  visibility_timeout: { type: 'text' },
                  api_timeout: { type: 'text' },
                },
              },
              {
                enabled: true,
                data_stream: { type: 'metrics', dataset: 'aws.cloudwatch_metrics' },
                vars: {
                  period: { value: '300s', type: 'text' },
                  regions: { value: [], type: 'text' },
                  latency: { type: 'text' },
                  metrics: {
                    value:
                      '- namespace: AWS/EC2\n  resource_type: ec2:instance\n  name:\n    - CPUUtilization\n    - DiskWriteOps\n  statistic:\n    - Average\n    - Maximum\n  # dimensions:\n   # - name: InstanceId\n      # value: i-123456\n  # tags:\n    # - key: created-by\n      # value: foo\n',
                    type: 'yaml',
                  },
                },
              },
            ],
          },
        ],
        vars: {
          shared_credential_file: { type: 'text' },
          credential_profile_name: { type: 'text' },
          access_key_id: { type: 'text' },
          secret_access_key: { type: 'text' },
          session_token: { type: 'text' },
          role_arn: { type: 'text' },
          endpoint: { value: 'amazonaws.com', type: 'text' },
        },
      });
    });
  });
});
