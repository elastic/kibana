/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy, PackagePolicyInput } from '../types';

import { storedPackagePoliciesToAgentInputs } from './package_policies_to_agent_inputs';

describe('Fleet - storedPackagePoliciesToAgentInputs', () => {
  const mockPackagePolicy: PackagePolicy = {
    id: 'some-uuid',
    name: 'mock-package-policy',
    description: '',
    created_at: '',
    created_by: '',
    updated_at: '',
    updated_by: '',
    policy_id: '',
    enabled: true,
    output_id: '',
    namespace: 'default',
    inputs: [],
    revision: 1,
  };

  const mockInput: PackagePolicyInput = {
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
        data_stream: { dataset: 'foo', type: 'logs' },
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
        data_stream: { dataset: 'bar', type: 'logs' },
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

  it('returns no inputs for package policy with no inputs, or only disabled inputs', () => {
    expect(storedPackagePoliciesToAgentInputs([mockPackagePolicy])).toEqual([]);

    expect(
      storedPackagePoliciesToAgentInputs([
        {
          ...mockPackagePolicy,
          package: {
            name: 'mock-package',
            title: 'Mock package',
            version: '0.0.0',
          },
        },
      ])
    ).toEqual([]);

    expect(
      storedPackagePoliciesToAgentInputs([
        {
          ...mockPackagePolicy,
          inputs: [{ ...mockInput, enabled: false }],
        },
      ])
    ).toEqual([]);
  });

  it('returns agent inputs with streams', () => {
    expect(
      storedPackagePoliciesToAgentInputs([
        {
          ...mockPackagePolicy,
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
        name: 'mock-package-policy',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
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
            data_stream: { dataset: 'foo', type: 'logs' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
          {
            id: 'test-logs-bar',
            data_stream: { dataset: 'bar', type: 'logs' },
          },
        ],
      },
    ]);
  });

  it('returns agent inputs without streams', () => {
    expect(
      storedPackagePoliciesToAgentInputs([
        {
          ...mockPackagePolicy,
          package: {
            name: 'mock-package',
            title: 'Mock package',
            version: '0.0.0',
          },
          inputs: [
            {
              ...mockInput,
              compiled_input: {
                inputVar: 'input-value',
              },
              streams: [],
            },
          ],
        },
      ])
    ).toEqual([
      {
        id: 'some-uuid',
        name: 'mock-package-policy',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'mock-package',
            version: '0.0.0',
          },
        },
        inputVar: 'input-value',
      },
    ]);
  });

  it('returns agent inputs without disabled streams', () => {
    expect(
      storedPackagePoliciesToAgentInputs([
        {
          ...mockPackagePolicy,
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
        name: 'mock-package-policy',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        streams: [
          {
            id: 'test-logs-foo',
            data_stream: { dataset: 'foo', type: 'logs' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
        ],
      },
    ]);
  });

  it('returns agent inputs with deeply merged config values', () => {
    expect(
      storedPackagePoliciesToAgentInputs([
        {
          ...mockPackagePolicy,
          inputs: [
            {
              ...mockInput,
              compiled_input: {
                agent_input_template_group1_vars: {
                  inputVar: 'input-value',
                },
                agent_input_template_group2_vars: {
                  inputVar3: {
                    testFieldGroup: {
                      subField1: 'subfield1',
                    },
                    testField: 'test',
                  },
                },
              },
              config: {
                agent_input_template_group1_vars: {
                  value: {
                    inputVar2: {},
                  },
                },
                agent_input_template_group2_vars: {
                  value: {
                    inputVar3: {
                      testFieldGroup: {
                        subField2: 'subfield2',
                      },
                    },
                    inputVar4: '',
                  },
                },
              },
            },
          ],
        },
      ])
    ).toEqual([
      {
        id: 'some-uuid',
        revision: 1,
        name: 'mock-package-policy',
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        agent_input_template_group1_vars: {
          inputVar: 'input-value',
          inputVar2: {},
        },
        agent_input_template_group2_vars: {
          inputVar3: {
            testField: 'test',
            testFieldGroup: {
              subField1: 'subfield1',
              subField2: 'subfield2',
            },
          },
          inputVar4: '',
        },
        streams: [
          {
            id: 'test-logs-foo',
            data_stream: { dataset: 'foo', type: 'logs' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
          { id: 'test-logs-bar', data_stream: { dataset: 'bar', type: 'logs' } },
        ],
      },
    ]);
  });
});
