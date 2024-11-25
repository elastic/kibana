/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, type RenderHookResult } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import type { Agent } from '../../../../../../../common';

import { useExportCSV } from './export_csv';

jest.mock('../../../../../../hooks', () => ({
  useGetAgentStatusRuntimeFieldQuery: jest.fn().mockReturnValue({
    data: 'emit("offline")',
    isLoading: false,
  }),
  useKibanaVersion: jest.fn().mockReturnValue('9.0.0'),
  useStartServices: jest.fn().mockReturnValue({
    notifications: {
      toasts: {
        addSuccess: jest.fn(),
        addError: jest.fn(),
      },
    },
    http: {},
    uiSettings: {},
  }),
}));

const mockGetDecoratedJobParams = jest.fn().mockImplementation((params) => params);
const mockCreateReportingShareJob = jest.fn().mockResolvedValue({});

jest.mock('@kbn/reporting-public', () => ({
  ReportingAPIClient: jest.fn().mockImplementation(() => ({
    getDecoratedJobParams: mockGetDecoratedJobParams,
    createReportingShareJob: mockCreateReportingShareJob,
  })),
}));

describe('export_csv', () => {
  let result: RenderHookResult<any, any>;

  function render() {
    const renderer = createFleetTestRendererMock();
    return renderer.renderHook(() => useExportCSV(true));
  }

  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      result = render();
    });
  });

  it('should generate reporting job for export csv with agent ids', () => {
    const agents = [{ id: 'agent1' }, { id: 'agent2' }] as Agent[];
    const sortOptions = {
      field: 'agent.id',
      direction: 'asc',
    };

    act(() => {
      result.result.current.generateReportingJobCSV(agents, sortOptions);
    });

    expect(mockGetDecoratedJobParams.mock.calls[0][0].columns.length).toEqual(6);
    expect(mockGetDecoratedJobParams.mock.calls[0][0].searchSource).toEqual(
      expect.objectContaining({
        filter: expect.objectContaining({
          query: {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  bool: {
                    minimum_should_match: 1,
                    should: [
                      {
                        match: {
                          'agent.id': 'agent1',
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    minimum_should_match: 1,
                    should: [
                      {
                        match: {
                          'agent.id': 'agent2',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        }),
        index: expect.objectContaining({
          runtimeFieldMap: {
            status: {
              script: {
                source: 'emit("offline")',
              },
              type: 'keyword',
            },
          },
        }),
        sort: [
          {
            'agent.id': {
              order: 'asc',
            },
          },
        ],
      })
    );
    expect(mockCreateReportingShareJob).toHaveBeenCalled();
  });

  it('should generate reporting job for export csv with agents query', () => {
    const agents = 'policy_id:1 AND status:online';

    act(() => {
      result.result.current.generateReportingJobCSV(agents, undefined);
    });

    expect(mockGetDecoratedJobParams.mock.calls[0][0].columns.length).toEqual(6);
    expect(mockGetDecoratedJobParams.mock.calls[0][0].searchSource).toEqual(
      expect.objectContaining({
        filter: expect.objectContaining({
          query: {
            bool: {
              filter: [
                {
                  bool: {
                    minimum_should_match: 1,
                    should: [
                      {
                        match: {
                          policy_id: '1',
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    minimum_should_match: 1,
                    should: [
                      {
                        match: {
                          status: 'online',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        }),
        sort: [
          {
            enrolled_at: {
              order: 'desc',
            },
          },
          {
            'local_metadata.host.hostname.keyword': {
              order: 'asc',
            },
          },
        ],
      })
    );
    expect(mockCreateReportingShareJob).toHaveBeenCalled();
  });
});
