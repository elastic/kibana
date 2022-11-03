/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useKibana } from '../../lib/kibana/kibana_react';
import { useActions } from './use_actions';

jest.mock('./use_add_to_existing_case', () => {
  return {
    useAddToExistingCase: jest.fn().mockReturnValue({
      disabled: false,
      onAddToExistingCaseClicked: jest.fn(),
    }),
  };
});
jest.mock('./use_add_to_new_case', () => {
  return {
    useAddToNewCase: jest.fn().mockReturnValue({
      disabled: false,
      onAddToNewCaseClicked: jest.fn(),
    }),
  };
});
jest.mock('../../lib/kibana/kibana_react', () => {
  return {
    useKibana: jest.fn(),
  };
});

describe(`useActions`, () => {
  const mockNavigateToPrefilledEditor = jest.fn();
  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        lens: {
          navigateToPrefilledEditor: mockNavigateToPrefilledEditor,
        },
      },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render actions', () => {
    const { result } = renderHook(() =>
      useActions({
        withActions: true,
        attributes: {
          description: '',
          state: {
            datasourceStates: {
              formBased: {
                layers: {
                  '416b6fad-1923-4f6a-a2df-b223bb287e30': {
                    columnOrder: ['b00c65ea-32be-4163-bfc8-f795b1ef9d06'],
                    columns: {
                      'b00c65ea-32be-4163-bfc8-f795b1ef9d06': {
                        customLabel: true,
                        dataType: 'number',
                        isBucketed: false,
                        label: ' ',
                        operationType: 'unique_count',
                        scale: 'ratio',
                        sourceField: 'host.name',
                      },
                    },
                    incompleteColumns: {},
                  },
                },
              },
            },
            filters: [
              {
                meta: {
                  type: 'phrases',
                  key: '_index',
                  params: ['packetbeat-*'],
                  alias: null,
                  negate: false,
                  disabled: false,
                },
                query: {
                  bool: {
                    should: [{ match_phrase: { _index: 'packetbeat-*' } }],
                    minimum_should_match: 1,
                  },
                },
              },
            ],
            query: { query: '', language: 'kuery' },
            visualization: {
              accessor: 'b00c65ea-32be-4163-bfc8-f795b1ef9d06',
              layerId: '416b6fad-1923-4f6a-a2df-b223bb287e30',
              layerType: 'data',
            },
          },
          title: '',
          visualizationType: 'lnsLegacyMetric',
          references: [
            {
              id: 'security-solution-default',
              name: 'indexpattern-datasource-current-indexpattern',
              type: 'index-pattern',
            },
            {
              id: 'security-solution-default',
              name: 'indexpattern-datasource-layer-416b6fad-1923-4f6a-a2df-b223bb287e30',
              type: 'index-pattern',
            },
          ],
        },
        timeRange: {
          from: '2022-10-26T23:00:00.000Z',
          to: '2022-11-03T15:16:50.053Z',
        },
        inspectActionProps: {
          onInspectActionClicked: jest.fn(),
          isDisabled: false,
        },
      })
    );

    expect(result.current[0].id).toEqual('inspect');
    expect(result.current[0].order).toEqual(4);
    expect(result.current[1].id).toEqual('openInLens');
    expect(result.current[1].order).toEqual(3);
    expect(result.current[2].id).toEqual('addToNewCase');
    expect(result.current[2].order).toEqual(2);
    expect(result.current[3].id).toEqual('addToExistingCase');
    expect(result.current[3].order).toEqual(1);
  });
});
