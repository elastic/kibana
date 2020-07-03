/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PackageConfig, PackageConfigInput } from '../types';
import { storedPackageConfigsToAgentInputs } from './package_configs_to_agent_inputs';

describe('Ingest Manager - storedPackageConfigsToAgentInputs', () => {
  const mockPackageConfig: PackageConfig = {
    id: 'some-uuid',
    name: 'mock-package-config',
    description: '',
    created_at: '',
    created_by: '',
    updated_at: '',
    updated_by: '',
    config_id: '',
    enabled: true,
    output_id: '',
    namespace: 'default',
    inputs: [],
    revision: 1,
  };

  const mockInput: PackageConfigInput = {
    type: 'test-logs',
    enabled: true,
    vars: {
      inputVar: { value: 'input-value' },
      inputVar2: { value: undefined },
      inputVar3: {
        type: 'yaml',
        value: 'testField: test',
      },
      inputVar4: { value: '' },
    },
    streams: [
      {
        id: 'test-logs-foo',
        enabled: true,
        dataset: { name: 'foo', type: 'logs' },
        vars: {
          fooVar: { value: 'foo-value' },
          fooVar2: { value: [1, 2] },
        },
        compiled_stream: {
          fooKey: 'fooValue1',
          fooKey2: ['fooValue2'],
        },
      },
      {
        id: 'test-logs-bar',
        enabled: true,
        dataset: { name: 'bar', type: 'logs' },
        vars: {
          barVar: { value: 'bar-value' },
          barVar2: { value: [1, 2] },
          barVar3: {
            type: 'yaml',
            value:
              '- namespace: mockNamespace\n  #disabledProp: ["test"]\n  anotherProp: test\n- namespace: mockNamespace2\n  #disabledProp: ["test2"]\n  anotherProp: test2',
          },
          barVar4: {
            type: 'yaml',
            value: '',
          },
          barVar5: {
            type: 'yaml',
            value: 'testField: test\n invalidSpacing: foo',
          },
        },
      },
    ],
  };

  it('returns no inputs for package config with no inputs, or only disabled inputs', () => {
    expect(storedPackageConfigsToAgentInputs([mockPackageConfig])).toEqual([]);

    expect(
      storedPackageConfigsToAgentInputs([
        {
          ...mockPackageConfig,
          package: {
            name: 'mock-package',
            title: 'Mock package',
            version: '0.0.0',
          },
        },
      ])
    ).toEqual([]);

    expect(
      storedPackageConfigsToAgentInputs([
        {
          ...mockPackageConfig,
          inputs: [{ ...mockInput, enabled: false }],
        },
      ])
    ).toEqual([]);
  });

  it('returns agent inputs', () => {
    expect(
      storedPackageConfigsToAgentInputs([
        {
          ...mockPackageConfig,
          package: {
            name: 'mock-package',
            title: 'Mock package',
            version: '0.0.0',
          },
          inputs: [mockInput],
        },
      ])
    ).toEqual([
      {
        id: 'some-uuid',
        name: 'mock-package-config',
        type: 'test-logs',
        dataset: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'mock-package',
            version: '0.0.0',
          },
        },
        streams: [
          {
            id: 'test-logs-foo',
            dataset: { name: 'foo', type: 'logs' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
          {
            id: 'test-logs-bar',
            dataset: { name: 'bar', type: 'logs' },
          },
        ],
      },
    ]);
  });

  it('returns agent inputs without disabled streams', () => {
    expect(
      storedPackageConfigsToAgentInputs([
        {
          ...mockPackageConfig,
          inputs: [
            {
              ...mockInput,
              streams: [{ ...mockInput.streams[0] }, { ...mockInput.streams[1], enabled: false }],
            },
          ],
        },
      ])
    ).toEqual([
      {
        id: 'some-uuid',
        name: 'mock-package-config',
        type: 'test-logs',
        dataset: { namespace: 'default' },
        use_output: 'default',
        streams: [
          {
            id: 'test-logs-foo',
            dataset: { name: 'foo', type: 'logs' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
        ],
      },
    ]);
  });
});
