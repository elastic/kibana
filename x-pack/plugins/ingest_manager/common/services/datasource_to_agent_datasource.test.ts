/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { NewDatasource } from '../types';
import { storedDatasourceToAgentDatasource } from './datasource_to_agent_datasource';

describe('Ingest Manager - storedDatasourceToAgentDatasource', () => {
  const mockDatasource: NewDatasource = {
    name: 'mock-datasource',
    description: '',
    config_id: '',
    enabled: true,
    output_id: '',
    namespace: 'default',
    inputs: [],
  };

  const mockInput = {
    type: 'test-logs',
    enabled: true,
    streams: [
      {
        id: 'test-logs-foo',
        enabled: true,
        dataset: 'foo',
        config: { fooVar: 'foo-value', fooVar2: [1, 2] },
      },
      {
        id: 'test-logs-bar',
        enabled: false,
        dataset: 'bar',
        config: { barVar: 'bar-value', barVar2: [1, 2] },
      },
    ],
  };

  it('returns agent datasource config for datasource with no inputs', () => {
    expect(storedDatasourceToAgentDatasource(mockDatasource)).toEqual({
      id: 'mock-datasource',
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
      id: 'mock-datasource',
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

  it('returns agent datasource config with flattened stream configs', () => {
    expect(storedDatasourceToAgentDatasource({ ...mockDatasource, inputs: [mockInput] })).toEqual({
      id: 'mock-datasource',
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
              fooVar: 'foo-value',
              fooVar2: [1, 2],
            },
            {
              id: 'test-logs-bar',
              enabled: false,
              dataset: 'bar',
              barVar: 'bar-value',
              barVar2: [1, 2],
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
      id: 'mock-datasource',
      namespace: 'default',
      enabled: true,
      use_output: 'default',
      inputs: [],
    });
  });
});
