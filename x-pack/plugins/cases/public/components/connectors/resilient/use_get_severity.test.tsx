/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useKibana } from '../../../common/lib/kibana';
import { connector } from '../mock';
import type { UseGetSeverity } from './use_get_severity';
import { useGetSeverity } from './use_get_severity';
import * as api from './api';

jest.mock('../../../common/lib/kibana');
jest.mock('./api');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useGetSeverity', () => {
  const { http, notifications } = useKibanaMock().services;

  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetSeverity>(() =>
        useGetSeverity({ http, toastNotifications: notifications.toasts })
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({ isLoading: true, severity: [] });
    });
  });

  test('fetch severity', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetSeverity>(() =>
        useGetSeverity({ http, toastNotifications: notifications.toasts, connector })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoading: false,
        severity: [
          {
            id: 4,
            name: 'Low',
          },
          {
            id: 5,
            name: 'Medium',
          },
          {
            id: 6,
            name: 'High',
          },
        ],
      });
    });
  });

  test('unhappy path', async () => {
    const spyOnGetCaseConfigure = jest.spyOn(api, 'getSeverity');
    spyOnGetCaseConfigure.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetSeverity>(() =>
        useGetSeverity({ http, toastNotifications: notifications.toasts, connector })
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({ isLoading: false, severity: [] });
    });
  });
});
