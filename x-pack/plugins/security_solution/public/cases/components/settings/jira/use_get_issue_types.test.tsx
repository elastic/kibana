/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useKibana } from '../../../../common/lib/kibana';
import { connector } from '../mock';
import { useGetIssueTypes, UseGetIssueTypes } from './use_get_issue_types';
import * as api from './api';

jest.mock('../../../../common/lib/kibana');
jest.mock('./api');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useGetIssueTypes', () => {
  const { http, notifications } = useKibanaMock().services;

  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetIssueTypes>(() =>
        useGetIssueTypes({ http, toastNotifications: notifications.toasts })
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({ isLoading: true, issueTypes: [] });
    });
  });

  test('fetch issue types', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetIssueTypes>(() =>
        useGetIssueTypes({ http, toastNotifications: notifications.toasts, connector })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoading: false,
        issueTypes: [
          {
            id: '10006',
            name: 'Task',
          },
          {
            id: '10007',
            name: 'Bug',
          },
        ],
      });
    });
  });

  test('unhappy path', async () => {
    const spyOnGetCaseConfigure = jest.spyOn(api, 'getIssueTypes');
    spyOnGetCaseConfigure.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetIssueTypes>(() =>
        useGetIssueTypes({ http, toastNotifications: notifications.toasts, connector })
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({ isLoading: false, issueTypes: [] });
    });
  });
});
