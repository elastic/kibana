/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useKibana } from '../../../../common/lib/kibana';
import { connector as actionConnector, issues } from '../mock';
import { useGetSingleIssue, UseGetSingleIssue } from './use_get_single_issue';
import * as api from './api';

jest.mock('../../../../common/lib/kibana');
jest.mock('./api');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useGetSingleIssue', () => {
  const { http, notifications } = useKibanaMock().services;
  beforeEach(() => jest.clearAllMocks());

  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetSingleIssue>(() =>
        useGetSingleIssue({
          http,
          toastNotifications: notifications.toasts,
          actionConnector,
          id: null,
        })
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({ isLoading: false, issue: null });
    });
  });

  test('fetch issues', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetSingleIssue>(() =>
        useGetSingleIssue({
          http,
          toastNotifications: notifications.toasts,
          actionConnector,
          id: '123',
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoading: false,
        issue: issues[0],
      });
    });
  });

  test('unhappy path', async () => {
    const spyOnGetCaseConfigure = jest.spyOn(api, 'getIssue');
    spyOnGetCaseConfigure.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetSingleIssue>(() =>
        useGetSingleIssue({
          http,
          toastNotifications: notifications.toasts,
          actionConnector,
          id: '123',
        })
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({ isLoading: false, issue: null });
    });
  });
});
