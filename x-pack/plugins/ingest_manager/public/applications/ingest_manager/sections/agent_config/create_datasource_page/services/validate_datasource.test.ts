/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  PackageInfo,
  InstallationStatus,
  NewDatasource,
  RegistryDatasource,
} from '../../../../types';
import { validateDatasource, validationHasErrors } from './validate_datasource';

describe('Ingest Manager - validateDatasource()', () => {
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
    status: InstallationStatus.notInstalled,
    datasources: [
      {
        name: 'datasource1',
        title: 'Datasource 1',
        description: 'test datasource',
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
            streams: [
              {
                dataset: 'foo',
                input: 'foo',
                title: 'Foo',
                vars: [{ name: 'var-name', type: 'yaml' }],
              },
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
            streams: [
              {
                dataset: 'bar',
                input: 'bar',
                title: 'Bar',
                vars: [{ name: 'var-name', type: 'yaml', required: true }],
              },
              {
                dataset: 'bar2',
                input: 'bar2',
                title: 'Bar 2',
                vars: [{ default: 'bar2-var-value', name: 'var-name', type: 'text' }],
              },
            ],
          },
          {
            type: 'with-no-config-or-streams',
            title: 'With no config or streams',
            streams: [],
          },
          {
            type: 'with-disabled-streams',
            title: 'With disabled streams',
            streams: [
              {
                dataset: 'disabled',
                input: 'disabled',
                title: 'Disabled',
                enabled: false,
                vars: [{ multi: true, required: true, name: 'var-name', type: 'text' }],
              },
              { dataset: 'disabled2', input: 'disabled2', title: 'Disabled 2', enabled: false },
            ],
          },
        ],
      },
    ],
  } as unknown) as PackageInfo;

  const validDatasource: NewDatasource = {
    name: 'datasource1-1',
    config_id: 'test-config',
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
            id: 'foo-foo',
            dataset: 'foo',
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
            id: 'bar-bar',
            dataset: 'bar',
            enabled: true,
            vars: { 'var-name': { value: 'test_yaml: value', type: 'yaml' } },
          },
          {
            id: 'bar-bar2',
            dataset: 'bar2',
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
            id: 'with-disabled-streams-disabled',
            dataset: 'disabled',
            enabled: false,
            vars: { 'var-name': { value: undefined, type: 'text' } },
          },
          {
            id: 'with-disabled-streams-disabled2',
            dataset: 'disabled2',
            enabled: false,
          },
        ],
      },
    ],
  };

  const invalidDatasource: NewDatasource = {
    ...validDatasource,
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
            id: 'foo-foo',
            dataset: 'foo',
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
            id: 'bar-bar',
            dataset: 'bar',
            enabled: true,
            vars: { 'var-name': { value: '    \n\n', type: 'yaml' } },
          },
          {
            id: 'bar-bar2',
            dataset: 'bar2',
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
            id: 'with-disabled-streams-disabled',
            dataset: 'disabled',
            enabled: false,
            vars: {
              'var-name': {
                value: 'invalid value but not checked due to not enabled',
                type: 'text',
              },
            },
          },
          {
            id: 'with-disabled-streams-disabled2',
            dataset: 'disabled2',
            enabled: false,
          },
        ],
      },
    ],
  };

  const noErrorsValidationResults = {
    name: null,
    description: null,
    inputs: {
      foo: {
        vars: {
          'foo-input-var-name': null,
          'foo-input2-var-name': null,
          'foo-input3-var-name': null,
        },
        streams: { 'foo-foo': { vars: { 'var-name': null } } },
      },
      bar: {
        vars: { 'bar-input-var-name': null, 'bar-input2-var-name': null },
        streams: {
          'bar-bar': { vars: { 'var-name': null } },
          'bar-bar2': { vars: { 'var-name': null } },
        },
      },
      'with-disabled-streams': {
        streams: { 'with-disabled-streams-disabled': { vars: { 'var-name': null } } },
      },
    },
  };

  it('returns no errors for valid datasource configuration', () => {
    expect(validateDatasource(validDatasource, mockPackage)).toEqual(noErrorsValidationResults);
  });

  it('returns errors for invalid datasource configuration', () => {
    expect(validateDatasource(invalidDatasource, mockPackage)).toEqual({
      name: ['Name is required'],
      description: null,
      inputs: {
        foo: {
          vars: {
            'foo-input-var-name': null,
            'foo-input2-var-name': ['foo-input2-var-name is required'],
            'foo-input3-var-name': ['foo-input3-var-name is required'],
          },
          streams: { 'foo-foo': { vars: { 'var-name': ['Invalid YAML format'] } } },
        },
        bar: {
          vars: {
            'bar-input-var-name': ['Invalid format'],
            'bar-input2-var-name': ['bar-input2-var-name is required'],
          },
          streams: {
            'bar-bar': { vars: { 'var-name': ['var-name is required'] } },
            'bar-bar2': { vars: { 'var-name': null } },
          },
        },
        'with-disabled-streams': {
          streams: { 'with-disabled-streams-disabled': { vars: { 'var-name': null } } },
        },
      },
    });
  });

  it('returns no errors for disabled inputs', () => {
    const disabledInputs = invalidDatasource.inputs.map(input => ({ ...input, enabled: false }));
    expect(validateDatasource({ ...validDatasource, inputs: disabledInputs }, mockPackage)).toEqual(
      noErrorsValidationResults
    );
  });

  it('returns only datasource and input-level errors for disabled streams', () => {
    const inputsWithDisabledStreams = invalidDatasource.inputs.map(input =>
      input.streams
        ? {
            ...input,
            streams: input.streams.map(stream => ({ ...stream, enabled: false })),
          }
        : input
    );
    expect(
      validateDatasource({ ...invalidDatasource, inputs: inputsWithDisabledStreams }, mockPackage)
    ).toEqual({
      name: ['Name is required'],
      description: null,
      inputs: {
        foo: {
          vars: {
            'foo-input-var-name': null,
            'foo-input2-var-name': ['foo-input2-var-name is required'],
            'foo-input3-var-name': ['foo-input3-var-name is required'],
          },
          streams: { 'foo-foo': { vars: { 'var-name': null } } },
        },
        bar: {
          vars: {
            'bar-input-var-name': ['Invalid format'],
            'bar-input2-var-name': ['bar-input2-var-name is required'],
          },
          streams: {
            'bar-bar': { vars: { 'var-name': null } },
            'bar-bar2': { vars: { 'var-name': null } },
          },
        },
        'with-disabled-streams': {
          streams: { 'with-disabled-streams-disabled': { vars: { 'var-name': null } } },
        },
      },
    });
  });

  it('returns no errors for packages with no datasources', () => {
    expect(
      validateDatasource(validDatasource, {
        ...mockPackage,
        datasources: undefined,
      })
    ).toEqual({
      name: null,
      description: null,
      inputs: null,
    });
    expect(
      validateDatasource(validDatasource, {
        ...mockPackage,
        datasources: [],
      })
    ).toEqual({
      name: null,
      description: null,
      inputs: null,
    });
  });

  it('returns no errors for packages with no inputs', () => {
    expect(
      validateDatasource(validDatasource, {
        ...mockPackage,
        datasources: [{} as RegistryDatasource],
      })
    ).toEqual({
      name: null,
      description: null,
      inputs: null,
    });
    expect(
      validateDatasource(validDatasource, {
        ...mockPackage,
        datasources: [({ inputs: [] } as unknown) as RegistryDatasource],
      })
    ).toEqual({
      name: null,
      description: null,
      inputs: null,
    });
  });
});

describe('Ingest Manager - validationHasErrors()', () => {
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

  it('returns true for datasource validation results with errors', () => {
    expect(
      validationHasErrors({
        name: ['name error'],
        description: null,
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
        inputs: {
          input1: {
            vars: { foo: null, bar: null },
            streams: { stream1: { vars: { foo: ['foo error'], bar: null } } },
          },
        },
      })
    ).toBe(true);
  });

  it('returns false for datasource validation results with no errors', () => {
    expect(
      validationHasErrors({
        name: null,
        description: null,
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
