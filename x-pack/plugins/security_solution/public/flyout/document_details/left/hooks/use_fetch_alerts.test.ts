/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useKibana } from '../../../../common/lib/kibana';
import { createFindAlerts } from '../services/find_alerts';
import { useFetchAlerts, type UseAlertsQueryParams } from './use_fetch_alerts';
import { createReactQueryWrapper } from '../../../../common/mock';

jest.mock('../../../../common/lib/kibana');
jest.mock('../services/find_alerts');

describe('useFetchAlerts', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          search: {
            search: jest.fn(),
          },
        },
      },
    });
  });

  it('fetches alerts and handles loading state', async () => {
    jest
      .mocked(createFindAlerts)
      .mockReturnValue(
        jest.fn().mockResolvedValue({ hits: { total: 10, hits: ['alert1', 'alert2', 'alert3'] } })
      );

    const params: UseAlertsQueryParams = {
      alertIds: ['id1', 'id2'],
      from: 0,
      size: 10,
      sort: [{ '@timestamp': 'desc' }],
    };

    const { result, waitFor } = renderHook(() => useFetchAlerts(params), {
      wrapper: createReactQueryWrapper(),
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(result.current.totalItemCount).toBe(10);
    expect(result.current.data).toEqual(['alert1', 'alert2', 'alert3']);
  });

  it('handles error state', async () => {
    // hide console error due to the line after
    jest.spyOn(console, 'error').mockImplementation(() => {});

    jest
      .mocked(createFindAlerts)
      .mockReturnValue(jest.fn().mockRejectedValue(new Error('Fetch failed')));

    const params: UseAlertsQueryParams = {
      alertIds: ['id1', 'id2'],
      from: 0,
      size: 10,
      sort: [{ '@timestamp': 'desc' }],
    };

    const { result, waitFor } = renderHook(() => useFetchAlerts(params), {
      wrapper: createReactQueryWrapper(),
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(true);
  });
});
