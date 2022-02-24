/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useParams, useLocation } from 'react-router-dom';

import { LensPublicStart, TypedLensByValueInput } from '../../../../../lens/public';
import { APP_ID } from '../../../../common/constants';
import { EmbeddableHistogram } from './embeddable_histogram';
import { ActionTypes } from '../../../../../observability/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { TestProviders } from '../../mock';

const mockLensAttrs: TypedLensByValueInput['attributes'] = {
  title: '[Host] KPI Hosts - metric 1',
  description: '',
  visualizationType: 'lnsMetric',
  state: {
    visualization: {
      accessor: 'b00c65ea-32be-4163-bfc8-f795b1ef9d06',
      layerId: '416b6fad-1923-4f6a-a2df-b223bb287e30',
      layerType: 'data',
    },
    query: {
      language: 'kuery',
      query: '',
    },
    filters: [],
    datasourceStates: {
      indexpattern: {
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
  },
  references: [
    {
      type: 'index-pattern',
      id: 'security-solution-default',
      name: 'indexpattern-datasource-current-indexpattern',
    },
    {
      type: 'index-pattern',
      id: 'security-solution-default',
      name: 'indexpattern-datasource-layer-416b6fad-1923-4f6a-a2df-b223bb287e30',
    },
    {
      type: 'tag',
      id: 'security-solution-default',
      name: 'tag-ref-security-solution-default',
    },
  ],
};
const mockTimeRange = {
  from: '2022-02-15T16:00:00.000Z',
  to: '2022-02-16T15:59:59.999Z',
};
const mockAppId = 'securitySolutionUI';
const mockIndexPatterns = 'auditbeat-*';
const mockReportType = 'kpi-over-time';
const mockTitle = 'mockTitle';
const mockLens = {
  EmbeddableComponent: jest.fn((props) => {
    return (
      <div
        data-test-subj={
          props.id === 'exploratoryView-singleMetric'
            ? 'exploratoryView-singleMetric'
            : 'exploratoryView'
        }
      >
        {'mockEmbeddableComponent'}
      </div>
    );
  }),
  SaveModalComponent: jest.fn(() => <div>{'mockSaveModalComponent'}</div>),
} as unknown as LensPublicStart;
const mockActions: ActionTypes[] = ['addToCase', 'openInLens'];

jest.mock('../../../../../../../src/plugins/kibana_react/public', () => {
  const actualModule = jest.requireActual('../../../../../../../src/plugins/kibana_react/public');
  return {
    ...actualModule,
    useKibana: jest.fn(),
  };
});

jest.mock('../../containers/sourcerer', () => {
  return {
    useSourcererDataView: jest.fn().mockReturnValue({
      dataViewId: 'mock-security-solution-default',
      selectedPatterns: ['auditbeat-*', 'filebeat-*'],
    }),
  };
});

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useParams: jest.fn().mockReturnValue({ tabName: '' }),
    useLocation: jest.fn().mockReturnValue({ pathname: '' }),
  };
});

describe('EmbeddableHistogram', () => {
  const mockEmbeddable = jest.fn((props) => <div>{'mockEmbeddable'}</div>);
  beforeEach(() => {
    jest.clearAllMocks();
    useKibana.mockReturnValue({
      services: {
        observability: {
          ExploratoryViewEmbeddable: jest.fn().mockImplementation(mockEmbeddable),
        },
        notifications: {
          toasts: { addError: jest.fn(), addSuccess: jest.fn(), addWarning: jest.fn() },
        },
      },
    });
  });
  test('render with default configs', () => {
    const { container, getByText } = render(
      <TestProviders>
        <EmbeddableHistogram
          customLensAttrs={mockLensAttrs}
          customTimeRange={mockTimeRange}
          title={mockTitle}
          isSingleMetric={false}
        />
      </TestProviders>
    );
    // expect(container.querySelector(`[data-test-subj="exploratoryView-title"]`)).toBeInTheDocument();
    // expect(getByText(mockTitle)).toBeInTheDocument();

    expect(mockEmbeddable.mock.calls[0][0].appId).toEqual('securitySolutionUI');
    expect(mockEmbeddable.mock.calls[0][0].attributes).toEqual([{ dataType: 'security-solution' }]);
    expect(mockEmbeddable.mock.calls[0][0].disableBorder).toEqual(true);
    expect(mockEmbeddable.mock.calls[0][0].disableShadow).toEqual(true);
    expect(mockEmbeddable.mock.calls[0][0].customHeight).toEqual('100%');
    expect(mockEmbeddable.mock.calls[0][0].isSingleMetric).toEqual(true);
    expect(mockEmbeddable.mock.calls[0][0].owner).toEqual(APP_ID);
    expect(mockEmbeddable.mock.calls[0][0].reportType).toEqual('kpi-over-time');
    expect(mockEmbeddable.mock.calls[0][0].withActions).toEqual([
      'save',
      'addToCase',
      'openInLens',
    ]);
    expect(mockEmbeddable.mock.calls[0][0].retryOnFetchDataViewFailure).toEqual(true);
  });

  test('render with tabs filter - Host: external alerts', () => {
    useParams.mockReturnValue({ tabName: 'externalAlerts' });
    useLocation.mockReturnValue({ pathname: 'hosts' });
    const { container, getByText } = render(
      <TestProviders>
        <EmbeddableHistogram
          customLensAttrs={mockLensAttrs}
          customTimeRange={mockTimeRange}
          title={mockTitle}
          isSingleMetric={false}
        />
      </TestProviders>
    );
    // expect(container.querySelector(`[data-test-subj="exploratoryView-title"]`)).toBeInTheDocument();
    // expect(getByText(mockTitle)).toBeInTheDocument();
    const expectedFilters = [
      {
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      bool: {
                        should: [
                          {
                            exists: {
                              field: 'source.ip',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            exists: {
                              field: 'destination.ip',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        meta: {
          alias: '',
          disabled: false,
          key: 'bool',
          negate: false,
          type: 'custom',
          value:
            '{"bool":{"filter":[{"bool":{"should":[{"bool":{"should":[{"exists":{"field": "source.ip"}}],"minimum_should_match":1}},{"bool":{"should":[{"exists":{"field": "destination.ip"}}],"minimum_should_match":1}}],"minimum_should_match":1}}]}}',
        },
      },
    ];
    expect(JSON.stringify(mockEmbeddable.mock.calls[0][0].customLensAttrs.state.filters)).toEqual(
      JSON.stringify(expectedFilters)
    );
  });

  test('render with tabs filter - Network: external alerts', () => {
    useParams.mockReturnValue({ tabName: 'external-alerts' });
    useLocation.mockReturnValue({ pathname: 'network' });
    const { container, getByText } = render(
      <TestProviders>
        <EmbeddableHistogram
          customLensAttrs={mockLensAttrs}
          customTimeRange={mockTimeRange}
          title={mockTitle}
          isSingleMetric={false}
        />
      </TestProviders>
    );
    // expect(container.querySelector(`[data-test-subj="exploratoryView-title"]`)).toBeInTheDocument();
    // expect(getByText(mockTitle)).toBeInTheDocument();
    const expectedFilters = [
      {
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      bool: {
                        should: [
                          {
                            exists: {
                              field: 'source.ip',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            exists: {
                              field: 'destination.ip',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        meta: {
          alias: '',
          disabled: false,
          key: 'bool',
          negate: false,
          type: 'custom',
          value:
            '{"bool":{"filter":[{"bool":{"should":[{"bool":{"should":[{"exists":{"field": "source.ip"}}],"minimum_should_match":1}},{"bool":{"should":[{"exists":{"field": "destination.ip"}}],"minimum_should_match":1}}],"minimum_should_match":1}}]}}',
        },
      },
    ];
    expect(JSON.stringify(mockEmbeddable.mock.calls[0][0].customLensAttrs.state.filters)).toEqual(
      JSON.stringify(expectedFilters)
    );
  });

  test.only('render with tabs filter - Network: external alerts', () => {
    useParams.mockReturnValue({ tabName: 'external-alerts' });
    useLocation.mockReturnValue({ pathname: 'network' });
    const { container, getByText } = render(
      <TestProviders>
        <EmbeddableHistogram
          customLensAttrs={mockLensAttrs}
          customTimeRange={mockTimeRange}
          title={mockTitle}
          isSingleMetric={false}
        />
      </TestProviders>
    );
    // expect(container.querySelector(`[data-test-subj="exploratoryView-title"]`)).toBeInTheDocument();
    // expect(getByText(mockTitle)).toBeInTheDocument();
    mockEmbeddable.mock.calls[0][0].customLensAttrs.references.forEach((ref) => {
      expect(ref.id).toEqual('mock-security-solution-default');
    });
  });
});
