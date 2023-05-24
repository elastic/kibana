/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { WrappedHelper } from '../utils/testing/rtl_helpers';
import { renderHook } from '@testing-library/react-hooks';
import { useMonitorName } from './use_monitor_name';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn().mockReturnValue({ monitorId: '12345' }),
}));

describe('useMonitorName', () => {
  const Wrapper = ({ children }: { children: React.ReactElement }) => {
    return (
      <WrappedHelper
        state={{
          monitorList: {
            error: null,
            loading: true,
            loaded: false,
            monitorUpsertStatuses: {},
            data: {
              absoluteTotal: 1,
              perPage: 5,
              page: 1,
              total: 1,
              monitors: [
                {
                  attributes: {
                    name: 'Test monitor name',
                    config_id: '12345',
                    locations: [
                      {
                        id: 'us_central_qa',
                      },
                    ],
                  },
                },
                {
                  attributes: {
                    name: 'Test monitor name 2',
                    config_id: '12346',
                    locations: [
                      {
                        id: 'us_central_qa',
                      },
                    ],
                  },
                },
              ],
              syncErrors: [],
            },
            pageState: {
              pageIndex: 1,
              pageSize: 10,
              sortOrder: 'asc',
              sortField: `name.keyword`,
            },
          },
        }}
      >
        {children}
      </WrappedHelper>
    );
  };

  it('returns expected results', () => {
    const { result } = renderHook(() => useMonitorName({}), { wrapper: Wrapper });

    expect(result.current).toStrictEqual({
      loading: true,
      values: [
        {
          key: '12346',
          label: 'Test monitor name 2',
          locationIds: ['us_central_qa'],
        },
      ],
      nameAlreadyExists: false,
      validName: '',
    });
  });

  it('returns expected results after data', async () => {
    const { result } = renderHook(() => useMonitorName({ search: 'Test monitor name 2' }), {
      wrapper: Wrapper,
    });

    expect(result.current).toStrictEqual({
      loading: true,
      nameAlreadyExists: false,
      validName: 'Test monitor name 2',
      values: [
        {
          key: '12346',
          label: 'Test monitor name 2',
          locationIds: ['us_central_qa'],
        },
      ],
    });
  });

  it('returns expected results after data while editing monitor', async () => {
    const { result } = renderHook(() => useMonitorName({ search: 'Test monitor name' }), {
      wrapper: Wrapper,
    });

    expect(result.current).toStrictEqual({
      loading: true,
      nameAlreadyExists: false,
      validName: 'Test monitor name',
      values: [
        {
          key: '12346',
          label: 'Test monitor name 2',
          locationIds: ['us_central_qa'],
        },
      ],
    });
  });
});
