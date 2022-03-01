/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { safeLoad } from 'js-yaml';

import { installationStatuses } from '../constants';
import type { PackageInfo, NewPackagePolicy, RegistryPolicyTemplate } from '../types';

import { validatePackagePolicy, validationHasErrors } from './validate_package_policy';
import { AWS_PACKAGE, INVALID_AWS_POLICY, VALID_AWS_POLICY } from './fixtures/aws_package';

describe('Fleet - validatePackagePolicy()', () => {
  describe('works for packages with single policy template (aka no integrations)', () => {
    const mockPackage = {
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
          dataset: 'bar3',
          streams: [
            {
              input: 'bar',
              title: 'Bar 3',
              vars: [{ default: true, name: 'var-name', type: 'bool' }],
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
    } as unknown as PackageInfo;

    const validPackagePolicy: NewPackagePolicy = {
      name: 'pkgPolicy1-1',
      namespace: 'default',
      policy_id: 'test-policy',
      enabled: true,
      output_id: 'test-output',
      inputs: [
        {
          type: 'foo',
          policy_template: 'pkgPolicy1',
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
          policy_template: 'pkgPolicy1',
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
            {
              data_stream: { dataset: 'bar3', type: 'logs' },
              enabled: true,
              vars: { 'var-name': { value: true, type: 'text' } },
            },
          ],
        },
        {
          type: 'with-no-config-or-streams',
          policy_template: 'pkgPolicy1',
          enabled: true,
          streams: [],
        },
        {
          type: 'with-disabled-streams',
          policy_template: 'pkgPolicy1',
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
          policy_template: 'pkgPolicy1',
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
          policy_template: 'pkgPolicy1',
          enabled: true,
          vars: {
            'foo-input-var-name': { value: undefined, type: 'text' },
            'foo-input2-var-name': { value: undefined, type: 'text' },
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
          policy_template: 'pkgPolicy1',
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
            {
              data_stream: { dataset: 'bar3', type: 'logs' },
              enabled: true,
              vars: { 'var-name': { value: 'not a bool', type: 'bool' } },
            },
          ],
        },
        {
          type: 'with-no-config-or-streams',
          policy_template: 'pkgPolicy1',
          enabled: true,
          streams: [],
        },
        {
          type: 'with-disabled-streams',
          policy_template: 'pkgPolicy1',
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
          policy_template: 'pkgPolicy1',
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
            bar3: { vars: { 'var-name': null } },
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
      expect(validatePackagePolicy(validPackagePolicy, mockPackage, safeLoad)).toEqual(
        noErrorsValidationResults
      );
    });

    it('returns errors for invalid package policy', () => {
      expect(validatePackagePolicy(invalidPackagePolicy, mockPackage, safeLoad)).toEqual({
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
              bar3: { vars: { 'var-name': ['Boolean values must be either true or false'] } },
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
        validatePackagePolicy(
          { ...validPackagePolicy, inputs: disabledInputs },
          mockPackage,
          safeLoad
        )
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
          mockPackage,
          safeLoad
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
              bar3: { vars: { 'var-name': null } },
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
        validatePackagePolicy(
          validPackagePolicy,
          {
            ...mockPackage,
            policy_templates: undefined,
          },
          safeLoad
        )
      ).toEqual({
        name: null,
        description: null,
        namespace: null,
        inputs: null,
      });
      expect(
        validatePackagePolicy(
          validPackagePolicy,
          {
            ...mockPackage,
            policy_templates: [],
          },
          safeLoad
        )
      ).toEqual({
        name: null,
        description: null,
        namespace: null,
        inputs: null,
      });
    });

    it('returns no errors for packages with no inputs', () => {
      expect(
        validatePackagePolicy(
          validPackagePolicy,
          {
            ...mockPackage,
            policy_templates: [{} as RegistryPolicyTemplate],
          },
          safeLoad
        )
      ).toEqual({
        name: null,
        description: null,
        namespace: null,
        inputs: null,
      });
      expect(
        validatePackagePolicy(
          validPackagePolicy,
          {
            ...mockPackage,
            policy_templates: [{ inputs: [] } as unknown as RegistryPolicyTemplate],
          },
          safeLoad
        )
      ).toEqual({
        name: null,
        description: null,
        namespace: null,
        inputs: null,
      });
    });

    it('returns no errors when required field is present but empty', () => {
      expect(
        validatePackagePolicy(
          {
            ...validPackagePolicy,
            inputs: [
              {
                type: 'foo',
                policy_template: 'pkgPolicy1',
                enabled: true,
                vars: {
                  'foo-input-var-name': { value: '', type: 'text' },
                  'foo-input2-var-name': { value: '', type: 'text' },
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
            ],
          },
          mockPackage,
          safeLoad
        )
      ).toEqual({
        name: null,
        description: null,
        namespace: null,
        inputs: {
          foo: {
            streams: {
              foo: {
                vars: {
                  'var-name': null,
                },
              },
            },
            vars: {
              'foo-input-var-name': null,
              'foo-input2-var-name': null,
              'foo-input3-var-name': null,
            },
          },
        },
      });
    });

    // TODO enable when https://github.com/elastic/kibana/issues/125655 is fixed
    it.skip('returns package policy validation error if input var does not exist', () => {
      expect(
        validatePackagePolicy(
          {
            description: 'Linux Metrics',
            enabled: true,
            inputs: [
              {
                enabled: true,
                streams: [
                  {
                    data_stream: {
                      dataset: 'linux.memory',
                      type: 'metrics',
                    },
                    enabled: true,
                  },
                ],
                type: 'linux/metrics',
                vars: {
                  period: {
                    type: 'string',
                    value: '1s',
                  },
                },
              },
            ],
            name: 'linux-3d13ada6-a9ae-46df-8e57-ff5050f4b671',
            namespace: 'default',
            output_id: '',
            package: {
              name: 'linux',
              title: 'Linux Metrics',
              version: '0.6.2',
            },
            policy_id: 'b25cb6e0-8347-11ec-96f9-6590c25bacf9',
          },
          {
            ...mockPackage,
            name: 'linux',
            policy_templates: [
              {
                name: 'system',
                title: 'Linux kernel metrics',
                description: 'Collect system metrics from Linux operating systems',
                inputs: [
                  {
                    title: 'Collect system metrics from Linux instances',
                    vars: [
                      {
                        name: 'system.hostfs',
                        type: 'text',
                        title: 'Proc Filesystem Directory',
                        multi: false,
                        required: false,
                        show_user: true,
                        description: 'The proc filesystem base directory.',
                      },
                    ],
                    type: 'system/metrics',
                    description:
                      'Collecting Linux entropy, Network Summary, RAID, service, socket, and users metrics',
                  },
                  {
                    title: 'Collect low-level system metrics from Linux instances',
                    vars: [],
                    type: 'linux/metrics',
                    description: 'Collecting Linux conntrack, ksm, pageinfo metrics.',
                  },
                ],
                multiple: true,
              },
            ],
            data_streams: [
              {
                dataset: 'linux.memory',
                package: 'linux',
                path: 'memory',
                streams: [
                  {
                    input: 'linux/metrics',
                    title: 'Linux memory metrics',
                    vars: [
                      {
                        name: 'period',
                        type: 'text',
                        title: 'Period',
                        multi: false,
                        required: true,
                        show_user: true,
                        default: '10s',
                      },
                    ],
                    template_path: 'stream.yml.hbs',
                    description: 'Linux paging and memory management metrics',
                  },
                ],
                title: 'Linux-only memory metrics',
                release: 'experimental',
                type: 'metrics',
              },
            ],
          },
          safeLoad
        )
      ).toEqual({
        description: null,
        inputs: {
          'linux/metrics': {
            streams: {
              'linux.memory': {
                vars: {
                  period: ['Period is required'],
                },
              },
            },
            vars: {
              period: ['period var definition does not exist'],
            },
          },
        },
        name: null,
        namespace: null,
      });
    });
  });

  describe('works for packages with multiple policy templates (aka integrations)', () => {
    it('returns errors for invalid package policy', () => {
      expect(
        validatePackagePolicy(
          INVALID_AWS_POLICY as NewPackagePolicy,
          AWS_PACKAGE as unknown as PackageInfo,
          safeLoad
        )
      ).toMatchSnapshot();
    });

    it('returns no errors for valid package policy', () => {
      expect(
        validationHasErrors(
          validatePackagePolicy(
            VALID_AWS_POLICY as NewPackagePolicy,
            AWS_PACKAGE as unknown as PackageInfo,
            safeLoad
          )
        )
      ).toBe(false);
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
