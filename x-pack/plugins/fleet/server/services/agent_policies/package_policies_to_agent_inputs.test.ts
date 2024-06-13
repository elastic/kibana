/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GLOBAL_DATA_TAG_EXCLUDED_INPUTS } from '../../../common/constants/epm';

import type { PackagePolicy, PackagePolicyInput } from '../../types';

import { storedPackagePoliciesToAgentInputs } from './package_policies_to_agent_inputs';

const packageInfoCache = new Map();
packageInfoCache.set('mock_package-0.0.0', {
  name: 'mock_package',
  version: '0.0.0',
  policy_templates: [
    {
      multiple: true,
    },
  ],
});
packageInfoCache.set('limited_package-0.0.0', {
  name: 'limited_package',
  version: '0.0.0',
  policy_templates: [
    {
      multiple: false,
    },
  ],
});

describe('Fleet - storedPackagePoliciesToAgentInputs', () => {
  const mockPackagePolicy: PackagePolicy = {
    id: 'some-uuid',
    name: 'mock_package-policy',
    description: '',
    created_at: '',
    created_by: '',
    updated_at: '',
    updated_by: '',
    policy_id: '',
    policy_ids: [''],
    enabled: true,
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

  const mockInput2: PackagePolicyInput = {
    type: 'test-metrics',
    policy_template: 'some-template',
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
        id: 'test-metrics-foo',
        enabled: true,
        data_stream: { dataset: 'foo', type: 'metrics' },
        vars: {
          fooVar: { value: 'foo-value' },
          fooVar2: { value: [1, 2] },
        },
        compiled_stream: {
          fooKey: 'fooValue1',
          fooKey2: ['fooValue2'],
        },
      },
    ],
  };

  it('returns no inputs for package policy with no inputs, or only disabled inputs', async () => {
    expect(await storedPackagePoliciesToAgentInputs([mockPackagePolicy], packageInfoCache)).toEqual(
      []
    );

    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'mock_package',
              title: 'Mock package',
              version: '0.0.0',
            },
          },
        ],
        packageInfoCache
      )
    ).toEqual([]);

    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            inputs: [{ ...mockInput, enabled: false }],
          },
        ],
        packageInfoCache
      )
    ).toEqual([]);
  });

  it('returns agent inputs with streams', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'mock_package',
              title: 'Mock package',
              version: '0.0.0',
            },
            inputs: [mockInput],
          },
        ],
        packageInfoCache
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'mock_package',
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

  it('returns unique agent inputs IDs, with policy template name if one exists for non-limited packages', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'mock_package',
              title: 'Mock package',
              version: '0.0.0',
            },
            inputs: [mockInput, mockInput2],
          },
          {
            ...mockPackagePolicy,
            package: {
              name: 'limited_package',
              title: 'Limited package',
              version: '0.0.0',
            },
            inputs: [mockInput2],
          },
        ],
        packageInfoCache
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'mock_package',
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
      {
        id: 'test-metrics-some-template-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-metrics',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
          },
        },
        streams: [
          {
            id: 'test-metrics-foo',
            data_stream: { dataset: 'foo', type: 'metrics' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
        ],
      },
      {
        id: 'some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-metrics',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'limited_package',
            version: '0.0.0',
          },
        },
        streams: [
          {
            id: 'test-metrics-foo',
            data_stream: { dataset: 'foo', type: 'metrics' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
        ],
      },
    ]);
  });

  it('returns agent inputs without streams', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'mock_package',
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
        ],
        packageInfoCache
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
          },
        },
        inputVar: 'input-value',
      },
    ]);
  });

  it('returns agent inputs without disabled streams', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            inputs: [
              {
                ...mockInput,
                streams: [{ ...mockInput.streams[0] }, { ...mockInput.streams[1], enabled: false }],
              },
            ],
          },
        ],
        packageInfoCache
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
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

  it('returns agent inputs with deeply merged config values', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
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
        ],
        packageInfoCache
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        revision: 1,
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
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
  it('returns agent inputs using package policy namespace if defined', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            inputs: [
              {
                ...mockInput,
                streams: [{ ...mockInput.streams[0] }, { ...mockInput.streams[1], enabled: false }],
              },
            ],
            namespace: 'packagepolicyspace',
          },
        ],
        packageInfoCache,
        'default',
        'agentpolicyspace'
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'packagepolicyspace' },
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
  it('returns agent inputs using agent policy namespace if package policy namespace is blank', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            inputs: [
              {
                ...mockInput,
                streams: [{ ...mockInput.streams[0] }, { ...mockInput.streams[1], enabled: false }],
              },
            ],
            namespace: '',
          },
        ],
        packageInfoCache,
        'default',
        'agentpolicyspace'
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'agentpolicyspace' },
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

  it('returns agent inputs merged with overrides from package policies if available for that input', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            inputs: [
              {
                ...mockInput,
              },
            ],
            namespace: '',
            overrides: {
              inputs: {
                'test-logs-some-uuid': {
                  log_level: 'debug',
                },
              },
            },
          },
        ],
        packageInfoCache,
        'default',
        'agentpolicyspace'
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'agentpolicyspace' },
        use_output: 'default',
        log_level: 'debug',
        streams: [
          {
            id: 'test-logs-foo',
            data_stream: { dataset: 'foo', type: 'logs' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
          {
            data_stream: {
              dataset: 'bar',
              type: 'logs',
            },
            id: 'test-logs-bar',
          },
        ],
      },
    ]);
  });

  it('returns agent inputs merged with overrides based on passed input id', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'mock_package',
              title: 'Mock package',
              version: '0.0.0',
            },
            inputs: [mockInput, mockInput2],
            namespace: '',
            overrides: {
              inputs: {
                'test-logs-some-uuid': {
                  log_level: 'debug',
                },
              },
            },
          },
        ],
        packageInfoCache
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        log_level: 'debug',
        data_stream: {
          namespace: 'default',
        },
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
          },
        },
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        streams: [
          {
            data_stream: {
              dataset: 'foo',
              type: 'logs',
            },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
            id: 'test-logs-foo',
          },
          {
            data_stream: {
              dataset: 'bar',
              type: 'logs',
            },
            id: 'test-logs-bar',
          },
        ],
        type: 'test-logs',
        use_output: 'default',
      },
      {
        data_stream: {
          namespace: 'default',
        },
        id: 'test-metrics-some-template-some-uuid',
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
          },
        },
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        streams: [
          {
            data_stream: {
              dataset: 'foo',
              type: 'metrics',
            },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
            id: 'test-metrics-foo',
          },
        ],
        type: 'test-metrics',
        use_output: 'default',
      },
    ]);
  });

  it('returns unchanged agent inputs if overrides are empty', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            inputs: [
              {
                ...mockInput,
                streams: [{ ...mockInput.streams[0] }, { ...mockInput.streams[1], enabled: false }],
              },
            ],
            namespace: '',
            overrides: {
              inputs: {},
            },
          },
        ],
        packageInfoCache,
        'default',
        'agentpolicyspace'
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'agentpolicyspace' },
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

  it('returns agent inputs with add fields process if global data tags are defined', async () => {
    const excludedInputs: PackagePolicyInput[] = [];
    const expectedExcluded = [];

    for (const input of GLOBAL_DATA_TAG_EXCLUDED_INPUTS) {
      excludedInputs.push({
        type: input,
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
        streams: [],
      });

      expectedExcluded.push({
        data_stream: {
          namespace: 'default',
        },
        id: `${input}-some-uuid`,
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
          },
        },
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: input,
        use_output: 'default',
      });
    }

    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'mock_package',
              title: 'Mock package',
              version: '0.0.0',
            },
            inputs: [
              ...excludedInputs,
              {
                ...mockInput,
                compiled_input: {
                  inputVar: 'input-value',
                },
                streams: [],
              },
              {
                ...mockInput2,
                compiled_input: {
                  inputVar: 'input-value',
                },
                streams: [],
              },
            ],
          },
        ],
        packageInfoCache,
        undefined,
        undefined,
        [
          { name: 'testName', value: 'testValue' },
          { name: 'testName2', value: 'testValue2' },
        ]
      )
    ).toEqual([
      ...expectedExcluded,
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        processors: [
          {
            add_fields: {
              fields: {
                testName: 'testValue',
                testName2: 'testValue2',
              },
              target: '',
            },
          },
        ],
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
          },
        },
        inputVar: 'input-value',
      },
      {
        id: 'test-metrics-some-template-some-uuid',
        data_stream: {
          namespace: 'default',
        },
        inputVar: 'input-value',
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
          },
        },
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        processors: [
          {
            add_fields: {
              target: '',
              fields: {
                testName: 'testValue',
                testName2: 'testValue2',
              },
            },
          },
        ],
        revision: 1,
        type: 'test-metrics',
        use_output: 'default',
      },
    ]);
  });
});
