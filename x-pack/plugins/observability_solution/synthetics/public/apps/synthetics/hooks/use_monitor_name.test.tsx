/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { fetchMonitorManagementList } from '../state';
import { useMonitorName } from './use_monitor_name';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn().mockReturnValue({ monitorId: '12345' }),
}));

jest.mock('../state', () => ({
  ...jest.requireActual('../state'),
  fetchMonitorManagementList: jest.fn(),
}));

describe('useMonitorName', () => {
  const testMonitors = [
    {
      name: 'Test monitor name',
      config_id: '12345',
      locations: [
        {
          id: 'us_central_qa',
        },
      ],
    },
    {
      name: 'Test monitor name 2',
      config_id: '12346',
      locations: [
        {
          id: 'us_central_qa',
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (fetchMonitorManagementList as jest.Mock).mockResolvedValue({
      monitors: testMonitors,
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('returns expected initial and after load state', async () => {
    const { result, waitForValueToChange } = renderHook(() => useMonitorName({}));

    expect(result.current).toStrictEqual({
      loading: true,
      values: [],
      nameAlreadyExists: false,
    });

    await waitForValueToChange(() => result.current.values);

    expect(result.current).toStrictEqual({
      loading: false,
      values: [
        {
          key: '12346',
          label: 'Test monitor name 2',
          locationIds: ['us_central_qa'],
        },
      ],
      nameAlreadyExists: false,
    });
  });

  it('returns correct "nameAlreadyExists" when name matches', async () => {
    const { result, waitForValueToChange } = renderHook(() =>
      useMonitorName({ search: 'Test monitor name 2' })
    );

    await waitForValueToChange(() => result.current.values); // Wait until data has been loaded
    expect(result.current).toStrictEqual({
      loading: false,
      nameAlreadyExists: true,
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
    const { result, waitForValueToChange } = renderHook(() =>
      useMonitorName({ search: 'Test monitor name' })
    );

    await waitForValueToChange(() => result.current.values); // Wait until data has been loaded
    expect(result.current).toStrictEqual({
      loading: false,
      nameAlreadyExists: false, // Should be `false` for the currently editing monitor,
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
