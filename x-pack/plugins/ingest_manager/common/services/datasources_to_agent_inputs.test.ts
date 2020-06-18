/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Datasource, DatasourceInput } from '../types';
import { storedDatasourcesToAgentInputs } from './datasources_to_agent_inputs';

describe('Ingest Manager - storedDatasourcesToAgentInputs', () => {
  const mockDatasource: Datasource = {
    id: 'some-uuid',
    name: 'mock-datasource',
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

  const mockInput: DatasourceInput = {
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
        dataset: 'foo',
        vars: {
          fooVar: { value: 'foo-value' },
          fooVar2: { value: [1, 2] },
        },
        agent_stream: {
          fooKey: 'fooValue1',
          fooKey2: ['fooValue2'],
        },
      },
      {
        id: 'test-logs-bar',
        enabled: true,
        dataset: 'bar',
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

  it('returns no inputs for datasource with no inputs, or only disabled inputs', () => {
    expect(storedDatasourcesToAgentInputs([mockDatasource])).toEqual([]);

    expect(
      storedDatasourcesToAgentInputs([
        {
          ...mockDatasource,
          package: {
            name: 'mock-package',
            title: 'Mock package',
            version: '0.0.0',
          },
        },
      ])
    ).toEqual([]);

    expect(
      storedDatasourcesToAgentInputs([
        {
          ...mockDatasource,
          inputs: [{ ...mockInput, enabled: false }],
        },
      ])
    ).toEqual([]);
  });

  it('returns agent inputs', () => {
    expect(storedDatasourcesToAgentInputs([{ ...mockDatasource, inputs: [mockInput] }])).toEqual([
      {
        id: 'some-uuid',
        name: 'mock-datasource',
        type: 'test-logs',
        dataset: { namespace: 'default' },
        use_output: 'default',
        streams: [
          {
            id: 'test-logs-foo',
            dataset: { name: 'foo' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
          {
            id: 'test-logs-bar',
            dataset: { name: 'bar' },
          },
        ],
      },
    ]);
  });

  it('returns agent inputs without disabled streams', () => {
    expect(
      storedDatasourcesToAgentInputs([
        {
          ...mockDatasource,
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
        name: 'mock-datasource',
        type: 'test-logs',
        dataset: { namespace: 'default' },
        use_output: 'default',
        streams: [
          {
            id: 'test-logs-foo',
            dataset: { name: 'foo' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
        ],
      },
    ]);
  });
});
