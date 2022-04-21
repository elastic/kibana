/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import { useFetchAlertData } from './use_fetch_alert_data';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

describe('useFetchAlertData', () => {
  const testIds = ['123'];

  beforeEach(() => {
    mockUseKibanaReturnValue.services.http.post.mockImplementation(async () => ({
      hits: {
        hits: [
          {
            _id: '123',
            _index: 'index',
            _source: {
              testField: 'test',
            },
          },
        ],
      },
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initially is not loading and does not have data', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, [boolean, Record<string, unknown>]>(
        () => useFetchAlertData(testIds)
      );

      await waitForNextUpdate();

      expect(result.current).toEqual([false, {}]);
    });
  });

  it('returns no data when an error occurs', async () => {
    mockUseKibanaReturnValue.services.http.post.mockImplementation(async () => {
      throw new Error('an http error');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, [boolean, Record<string, unknown>]>(
        () => useFetchAlertData(testIds)
      );

      await waitForNextUpdate();

      expect(result.current).toEqual([false, {}]);
    });
  });

  it('retrieves the alert data', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, [boolean, Record<string, unknown>]>(
        () => useFetchAlertData(testIds)
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual([
        false,
        { '123': { _id: '123', _index: 'index', testField: 'test' } },
      ]);
    });
  });

  it('does not populate the results when the request is canceled', async () => {
    await act(async () => {
      const { result, waitForNextUpdate, unmount } = renderHook<
        string,
        [boolean, Record<string, unknown>]
      >(() => useFetchAlertData(testIds));

      await waitForNextUpdate();
      unmount();

      expect(result.current).toEqual([false, {}]);
    });
  });
});
