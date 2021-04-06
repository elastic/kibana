/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { installationStatuses } from '../../../../../../../common/constants';
import type { PackageInfo, NewPackagePolicy, RegistryPolicyTemplate } from '../../../../types';

import { validatePackagePolicy, validationHasErrors } from './validate_package_policy';

describe('Fleet - validatePackagePolicy()', () => {
  describe('works for packages without integrations', () => {
    const mockPackage = ({
      name: 'mock-package',
      title: 'Mock package',
      version: '0.0.0',
      description: 'description',
      type: 'mock',
      categories: [],
      requirement: { kibana: { versions: '' }, elasticsearch: { versions: '' } },
      format_version: '',
      download: '',
      path: '',
      assets: {
        kibana: {
          dashboard: [],
          visualization: [],
          search: [],
          'index-pattern': [],
        },
      },
      status: installationStatuses.NotInstalled,
      data_streams: [
        {
          dataset: 'foo',
          streams: [
            {
              input: 'foo',
              title: 'Foo',
              vars: [{ name: 'var-name', type: 'yaml' }],
            },
          ],
        },
        {
          dataset: 'bar',
          streams: [
            {
              input: 'bar',
              title: 'Bar',
              vars: [{ name: 'var-name', type: 'yaml', required: true }],
            },
            {
              input: 'with-no-stream-vars',
              title: 'Bar stream no vars',
              enabled: true,
            },
          ],
        },
        {
          dataset: 'bar2',
          streams: [
            {
              input: 'bar',
              title: 'Bar 2',
              vars: [{ default: 'bar2-var-value', name: 'var-name', type: 'text' }],
            },
          ],
        },
        {
          dataset: 'disabled',
          streams: [
            {
              input: 'with-disabled-streams',
              title: 'Disabled',
              enabled: false,
              vars: [{ multi: true, required: true, name: 'var-name', type: 'text' }],
            },
          ],
        },
        {
          dataset: 'disabled2',
          streams: [
            {
              input: 'with-disabled-streams',
              title: 'Disabled 2',
              enabled: false,
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
                  default: 'foo-input2-var-value',
                  name: 'foo-input2-var-name',
                  required: true,
                  type: 'text',
                },
                { name: 'foo-input3-var-name', type: 'text', required: true, multi: true },
              ],
            },
            {
              type: 'bar',
              title: 'Bar',
              vars: [
                {
                  default: ['value1', 'value2'],
                  name: 'bar-input-var-name',
                  type: 'text',
                  multi: true,
                },
                { name: 'bar-input2-var-name', required: true, type: 'text' },
              ],
            },
            {
              type: 'with-no-config-or-streams',
              title: 'With no config or streams',
            },
            {
              type: 'with-disabled-streams',
              title: 'With disabled streams',
            },
            {
              type: 'with-no-stream-vars',
              enabled: true,
              vars: [{ required: true, name: 'var-name', type: 'text' }],
            },
          ],
        },
      ],
    } as unknown) as PackageInfo;

    const validPackagePolicy: NewPackagePolicy = {
      name: 'pkgPolicy1-1',
      namespace: 'default',
      policy_id: 'test-policy',
      enabled: true,
      output_id: 'test-output',
      inputs: [
        {
          type: 'foo',
          enabled: true,
          vars: {
            'foo-input-var-name': { value: 'foo-input-var-value', type: 'text' },
            'foo-input2-var-name': { value: 'foo-input2-var-value', type: 'text' },
            'foo-input3-var-name': { value: ['test'], type: 'text' },
          },
          streams: [
            {
              data_stream: { dataset: 'foo', type: 'logs' },
              enabled: true,
              vars: { 'var-name': { value: 'test_yaml: value', type: 'yaml' } },
            },
          ],
        },
        {
          type: 'bar',
          enabled: true,
          vars: {
            'bar-input-var-name': { value: ['value1', 'value2'], type: 'text' },
            'bar-input2-var-name': { value: 'test', type: 'text' },
          },
          streams: [
            {
              data_stream: { dataset: 'bar', type: 'logs' },
              enabled: true,
              vars: { 'var-name': { value: 'test_yaml: value', type: 'yaml' } },
            },
            {
              data_stream: { dataset: 'bar2', type: 'logs' },
              enabled: true,
              vars: { 'var-name': { value: undefined, type: 'text' } },
            },
          ],
        },
        {
          type: 'with-no-config-or-streams',
          enabled: true,
          streams: [],
        },
        {
          type: 'with-disabled-streams',
          enabled: true,
          streams: [
            {
              data_stream: { dataset: 'disabled', type: 'logs' },
              enabled: false,
              vars: { 'var-name': { value: undefined, type: 'text' } },
            },
            {
              data_stream: { dataset: 'disabled2', type: 'logs' },
              enabled: false,
            },
          ],
        },
        {
          type: 'with-no-stream-vars',
          enabled: true,
          vars: {
            'var-name': { value: 'test', type: 'text' },
          },
          streams: [
            {
              data_stream: { dataset: 'with-no-stream-vars-bar', type: 'logs' },
              enabled: true,
            },
          ],
        },
      ],
    };

    const invalidPackagePolicy: NewPackagePolicy = {
      ...validPackagePolicy,
      name: '',
      inputs: [
        {
          type: 'foo',
          enabled: true,
          vars: {
            'foo-input-var-name': { value: undefined, type: 'text' },
            'foo-input2-var-name': { value: '', type: 'text' },
            'foo-input3-var-name': { value: [], type: 'text' },
          },
          streams: [
            {
              data_stream: { dataset: 'foo', type: 'logs' },
              enabled: true,
              vars: { 'var-name': { value: 'invalidyaml: test\n foo bar:', type: 'yaml' } },
            },
          ],
        },
        {
          type: 'bar',
          enabled: true,
          vars: {
            'bar-input-var-name': { value: 'invalid value for multi', type: 'text' },
            'bar-input2-var-name': { value: undefined, type: 'text' },
          },
          streams: [
            {
              data_stream: { dataset: 'bar', type: 'logs' },
              enabled: true,
              vars: { 'var-name': { value: '    \n\n', type: 'yaml' } },
            },
            {
              data_stream: { dataset: 'bar2', type: 'logs' },
              enabled: true,
              vars: { 'var-name': { value: undefined, type: 'text' } },
            },
          ],
        },
        {
          type: 'with-no-config-or-streams',
          enabled: true,
          streams: [],
        },
        {
          type: 'with-disabled-streams',
          enabled: true,
          streams: [
            {
              data_stream: { dataset: 'disabled', type: 'logs' },
              enabled: false,
              vars: {
                'var-name': {
                  value: 'invalid value but not checked due to not enabled',
                  type: 'text',
                },
              },
            },
            {
              data_stream: { dataset: 'disabled2', type: 'logs' },
              enabled: false,
            },
          ],
        },
        {
          type: 'with-no-stream-vars',
          enabled: true,
          vars: {
            'var-name': { value: undefined, type: 'text' },
          },
          streams: [
            {
              data_stream: { dataset: 'with-no-stream-vars-bar', type: 'logs' },
              enabled: true,
            },
          ],
        },
      ],
    };

    const noErrorsValidationResults = {
      name: null,
      description: null,
      namespace: null,
      inputs: {
        foo: {
          vars: {
            'foo-input-var-name': null,
            'foo-input2-var-name': null,
            'foo-input3-var-name': null,
          },
          streams: { foo: { vars: { 'var-name': null } } },
        },
        bar: {
          vars: { 'bar-input-var-name': null, 'bar-input2-var-name': null },
          streams: {
            bar: { vars: { 'var-name': null } },
            bar2: { vars: { 'var-name': null } },
          },
        },
        'with-disabled-streams': {
          streams: {
            disabled: {
              vars: { 'var-name': null },
            },
            disabled2: {},
          },
        },
        'with-no-stream-vars': {
          streams: {
            'with-no-stream-vars-bar': {},
          },
          vars: { 'var-name': null },
        },
      },
    };

    it('returns no errors for valid package policy', () => {
      expect(validatePackagePolicy(validPackagePolicy, mockPackage)).toEqual(
        noErrorsValidationResults
      );
    });

    it('returns errors for invalid package policy', () => {
      expect(validatePackagePolicy(invalidPackagePolicy, mockPackage)).toEqual({
        name: ['Name is required'],
        description: null,
        namespace: null,
        inputs: {
          foo: {
            vars: {
              'foo-input-var-name': null,
              'foo-input2-var-name': ['foo-input2-var-name is required'],
              'foo-input3-var-name': ['foo-input3-var-name is required'],
            },
            streams: { foo: { vars: { 'var-name': ['Invalid YAML format'] } } },
          },
          bar: {
            vars: {
              'bar-input-var-name': ['Invalid format'],
              'bar-input2-var-name': ['bar-input2-var-name is required'],
            },
            streams: {
              bar: { vars: { 'var-name': ['var-name is required'] } },
              bar2: { vars: { 'var-name': null } },
            },
          },
          'with-disabled-streams': {
            streams: {
              disabled: { vars: { 'var-name': null } },
              disabled2: {},
            },
          },
          'with-no-stream-vars': {
            vars: {
              'var-name': ['var-name is required'],
            },
            streams: { 'with-no-stream-vars-bar': {} },
          },
        },
      });
    });

    it('returns no errors for disabled inputs', () => {
      const disabledInputs = invalidPackagePolicy.inputs.map((input) => ({
        ...input,
        enabled: false,
      }));
      expect(
        validatePackagePolicy({ ...validPackagePolicy, inputs: disabledInputs }, mockPackage)
      ).toEqual(noErrorsValidationResults);
    });

    it('returns only package policy and input-level errors for disabled streams', () => {
      const inputsWithDisabledStreams = invalidPackagePolicy.inputs.map((input) =>
        input.streams
          ? {
              ...input,
              streams: input.streams.map((stream) => ({ ...stream, enabled: false })),
            }
          : input
      );
      expect(
        validatePackagePolicy(
          { ...invalidPackagePolicy, inputs: inputsWithDisabledStreams },
          mockPackage
        )
      ).toEqual({
        name: ['Name is required'],
        description: null,
        namespace: null,
        inputs: {
          foo: {
            vars: {
              'foo-input-var-name': null,
              'foo-input2-var-name': ['foo-input2-var-name is required'],
              'foo-input3-var-name': ['foo-input3-var-name is required'],
            },
            streams: { foo: { vars: { 'var-name': null } } },
          },
          bar: {
            vars: {
              'bar-input-var-name': ['Invalid format'],
              'bar-input2-var-name': ['bar-input2-var-name is required'],
            },
            streams: {
              bar: { vars: { 'var-name': null } },
              bar2: { vars: { 'var-name': null } },
            },
          },
          'with-disabled-streams': {
            streams: {
              disabled: {
                vars: { 'var-name': null },
              },
              disabled2: {},
            },
          },
          'with-no-stream-vars': {
            vars: {
              'var-name': ['var-name is required'],
            },
            streams: { 'with-no-stream-vars-bar': {} },
          },
        },
      });
    });

    it('returns no errors for packages with no package policies', () => {
      expect(
        validatePackagePolicy(validPackagePolicy, {
          ...mockPackage,
          policy_templates: undefined,
        })
      ).toEqual({
        name: null,
        description: null,
        namespace: null,
        inputs: null,
      });
      expect(
        validatePackagePolicy(validPackagePolicy, {
          ...mockPackage,
          policy_templates: [],
        })
      ).toEqual({
        name: null,
        description: null,
        namespace: null,
        inputs: null,
      });
    });

    it('returns no errors for packages with no inputs', () => {
      expect(
        validatePackagePolicy(validPackagePolicy, {
          ...mockPackage,
          policy_templates: [{} as RegistryPolicyTemplate],
        })
      ).toEqual({
        name: null,
        description: null,
        namespace: null,
        inputs: null,
      });
      expect(
        validatePackagePolicy(validPackagePolicy, {
          ...mockPackage,
          policy_templates: [({ inputs: [] } as unknown) as RegistryPolicyTemplate],
        })
      ).toEqual({
        name: null,
        description: null,
        namespace: null,
        inputs: null,
      });
    });
  });

  describe('works for packages with integrations (multiple policy templates)', () => {
    const mockPackage = ({
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

    const validPackagePolicy: NewPackagePolicy = {
      name: 'mock-package-1',
      namespace: 'default',
      package: { name: 'mock-package', title: 'Mock package', version: '0.0.0' },
      enabled: true,
      policy_id: 'some-policy-id',
      output_id: 'some-output-id',
      inputs: [
        {
          type: 's3',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { type: 'logs', dataset: 'aws.cloudtrail' },
              vars: {
                queue_url: { type: 'text', value: 'localhost' },
                fips_enabled: { value: false, type: 'bool' },
              },
            },
          ],
          integration: 'cloudtrail',
          vars: { visibility_timeout: { type: 'text' }, api_timeout: { type: 'text' } },
        },
        {
          type: 's3',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { type: 'logs', dataset: 'aws.cloudwatch_logs' },
              vars: {
                queue_url: { type: 'text', value: 'localhost' },
                fips_enabled: { value: false, type: 'bool' },
              },
            },
          ],
          integration: 'cloudwatch',
          vars: { visibility_timeout: { type: 'text' }, api_timeout: { type: 'text' } },
        },
        {
          type: 'aws/metrics',
          enabled: true,
          streams: [
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
          integration: 'cloudwatch',
          vars: {
            metrics: {
              value:
                '- namespace: AWS/EC2\n  resource_type: ec2:instance\n  name:\n    - CPUUtilization\n    - DiskWriteOps\n  statistic:\n    - Average\n    - Maximum\n  # dimensions:\n   # - name: InstanceId\n      # value: i-123456\n  # tags:\n    # - key: created-by\n      # value: foo\n',
              type: 'yaml',
            },
          },
        },
      ],
      integrations: [
        { name: 'cloudtrail', enabled: true },
        { name: 'cloudwatch', enabled: true },
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
    };

    const noErrorsValidationResults = {
      name: null,
      description: null,
      namespace: null,
      inputs: {
        's3-cloudtrail': {
          streams: {
            'aws.cloudtrail': {
              vars: {
                queue_url: null,
                fips_enabled: null,
              },
            },
          },
          vars: {
            visibility_timeout: null,
            api_timeout: null,
          },
        },
        's3-cloudwatch': {
          streams: {
            'aws.cloudwatch_logs': {
              vars: {
                queue_url: null,
                fips_enabled: null,
              },
            },
          },
          vars: {
            visibility_timeout: null,
            api_timeout: null,
          },
        },
        'aws/metrics-cloudwatch': {
          streams: {
            'aws.cloudwatch_metrics': {
              vars: {
                period: null,
                regions: null,
                latency: null,
                metrics: null,
              },
            },
          },
          vars: {
            metrics: null,
          },
        },
      },
      vars: {
        shared_credential_file: null,
        credential_profile_name: null,
        access_key_id: null,
        secret_access_key: null,
        session_token: null,
        role_arn: null,
        endpoint: null,
      },
    };

    it('returns no errors for valid package policy', () => {
      expect(validatePackagePolicy(validPackagePolicy, mockPackage)).toEqual(
        noErrorsValidationResults
      );
    });
  });
});

describe('Fleet - validationHasErrors()', () => {
  it('returns true for stream validation results with errors', () => {
    expect(
      validationHasErrors({
        vars: { foo: ['foo error'], bar: null },
      })
    ).toBe(true);
  });

  it('returns false for stream validation results with no errors', () => {
    expect(
      validationHasErrors({
        vars: { foo: null, bar: null },
      })
    ).toBe(false);
  });

  it('returns true for input validation results with errors', () => {
    expect(
      validationHasErrors({
        vars: { foo: ['foo error'], bar: null },
        streams: { stream1: { vars: { foo: null, bar: null } } },
      })
    ).toBe(true);
    expect(
      validationHasErrors({
        vars: { foo: null, bar: null },
        streams: { stream1: { vars: { foo: ['foo error'], bar: null } } },
      })
    ).toBe(true);
  });

  it('returns false for input validation results with no errors', () => {
    expect(
      validationHasErrors({
        vars: { foo: null, bar: null },
        streams: { stream1: { vars: { foo: null, bar: null } } },
      })
    ).toBe(false);
  });

  it('returns true for package policy validation results with errors', () => {
    expect(
      validationHasErrors({
        name: ['name error'],
        description: null,
        namespace: null,
        inputs: {
          input1: {
            vars: { foo: null, bar: null },
            streams: { stream1: { vars: { foo: null, bar: null } } },
          },
        },
      })
    ).toBe(true);
    expect(
      validationHasErrors({
        name: null,
        description: null,
        namespace: null,
        inputs: {
          input1: {
            vars: { foo: ['foo error'], bar: null },
            streams: { stream1: { vars: { foo: null, bar: null } } },
          },
        },
      })
    ).toBe(true);
    expect(
      validationHasErrors({
        name: null,
        description: null,
        namespace: null,
        inputs: {
          input1: {
            vars: { foo: null, bar: null },
            streams: { stream1: { vars: { foo: ['foo error'], bar: null } } },
          },
        },
      })
    ).toBe(true);
  });

  it('returns false for package policy validation results with no errors', () => {
    expect(
      validationHasErrors({
        name: null,
        description: null,
        namespace: null,
        inputs: {
          input1: {
            vars: { foo: null, bar: null },
            streams: { stream1: { vars: { foo: null, bar: null } } },
          },
        },
      })
    ).toBe(false);
  });
});
