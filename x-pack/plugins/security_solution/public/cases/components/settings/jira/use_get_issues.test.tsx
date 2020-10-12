/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useKibana } from '../../../../common/lib/kibana';
import { connector as actionConnector, issues } from '../mock';
import { useGetIssues, UseGetIssues } from './use_get_issues';
import * as api from './api';

jest.mock('../../../../common/lib/kibana');
jest.mock('./api');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useGetIssues', () => {
  const { http, notifications } = useKibanaMock().services;
  beforeEach(() => jest.clearAllMocks());

  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetIssues>(() =>
        useGetIssues({
          http,
          toastNotifications: notifications.toasts,
          actionConnector,
          query: null,
        })
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({ isLoading: false, issues: [] });
    });
  });

  test('fetch issues', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetIssues>(() =>
        useGetIssues({
          http,
          toastNotifications: notifications.toasts,
          actionConnector,
          query: 'Task',
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoading: false,
        issues,
      });
    });
  });

  test('unhappy path', async () => {
    const spyOnGetCaseConfigure = jest.spyOn(api, 'getIssues');
    spyOnGetCaseConfigure.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetIssues>(() =>
        useGetIssues({
          http,
          toastNotifications: notifications.toasts,
          actionConnector,
          query: 'oh no',
        })
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({ isLoading: false, issues: [] });
    });
  });
});
