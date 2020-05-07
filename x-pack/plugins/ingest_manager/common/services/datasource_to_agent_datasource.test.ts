/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Datasource, DatasourceInput } from '../types';
import { storedDatasourceToAgentDatasource } from './datasource_to_agent_datasource';

describe('Ingest Manager - storedDatasourceToAgentDatasource', () => {
  const mockDatasource: Datasource = {
    id: 'some-uuid',
    name: 'mock-datasource',
    description: '',
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

  it('returns agent datasource config for datasource with no inputs', () => {
    expect(storedDatasourceToAgentDatasource(mockDatasource)).toEqual({
      id: 'some-uuid',
      name: 'mock-datasource',
      namespace: 'default',
      enabled: true,
      use_output: 'default',
      inputs: [],
    });

    expect(
      storedDatasourceToAgentDatasource({
        ...mockDatasource,
        package: {
          name: 'mock-package',
          title: 'Mock package',
          version: '0.0.0',
        },
      })
    ).toEqual({
      id: 'some-uuid',
      name: 'mock-datasource',
      namespace: 'default',
      enabled: true,
      use_output: 'default',
      package: {
        name: 'mock-package',
        version: '0.0.0',
      },
      inputs: [],
    });
  });

  it('returns agent datasource config with flattened input and package stream', () => {
    expect(storedDatasourceToAgentDatasource({ ...mockDatasource, inputs: [mockInput] })).toEqual({
      id: 'some-uuid',
      name: 'mock-datasource',
      namespace: 'default',
      enabled: true,
      use_output: 'default',
      inputs: [
        {
          type: 'test-logs',
          enabled: true,
          streams: [
            {
              id: 'test-logs-foo',
              enabled: true,
              dataset: 'foo',
              fooKey: 'fooValue1',
              fooKey2: ['fooValue2'],
            },
            {
              id: 'test-logs-bar',
              enabled: true,
              dataset: 'bar',
            },
          ],
        },
      ],
    });
  });

  it('returns agent datasource config without disabled streams', () => {
    expect(
      storedDatasourceToAgentDatasource({
        ...mockDatasource,
        inputs: [
          {
            ...mockInput,
            streams: [{ ...mockInput.streams[0] }, { ...mockInput.streams[1], enabled: false }],
          },
        ],
      })
    ).toEqual({
      id: 'some-uuid',
      name: 'mock-datasource',
      namespace: 'default',
      enabled: true,
      use_output: 'default',
      inputs: [
        {
          type: 'test-logs',
          enabled: true,
          streams: [
            {
              id: 'test-logs-foo',
              enabled: true,
              dataset: 'foo',
              fooKey: 'fooValue1',
              fooKey2: ['fooValue2'],
            },
          ],
        },
      ],
    });
  });

  it('returns agent datasource config without disabled inputs', () => {
    expect(
      storedDatasourceToAgentDatasource({
        ...mockDatasource,
        inputs: [{ ...mockInput, enabled: false }],
      })
    ).toEqual({
      id: 'some-uuid',
      name: 'mock-datasource',
      namespace: 'default',
      enabled: true,
      use_output: 'default',
      inputs: [],
    });
  });
});
