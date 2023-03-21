/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useKibana } from '../../../common/lib/kibana';
import { connector } from '../mock';
import type { UseGetFieldsByIssueType } from './use_get_fields_by_issue_type';
import { useGetFieldsByIssueType } from './use_get_fields_by_issue_type';
import * as api from './api';

jest.mock('../../../common/lib/kibana');
jest.mock('./api');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useGetFieldsByIssueType', () => {
  const { http, notifications } = useKibanaMock().services;

  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetFieldsByIssueType>(() =>
        useGetFieldsByIssueType({ http, toastNotifications: notifications.toasts, issueType: null })
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({ isLoading: true, fields: {} });
    });
  });

  test('does not fetch when issueType is not provided', async () => {
    const spyOnGetFieldsByIssueType = jest.spyOn(api, 'getFieldsByIssueType');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetFieldsByIssueType>(() =>
        useGetFieldsByIssueType({
          http,
          toastNotifications: notifications.toasts,
          connector,
          issueType: null,
        })
      );

      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(spyOnGetFieldsByIssueType).not.toHaveBeenCalled();
      expect(result.current).toEqual({ isLoading: false, fields: {} });
    });
  });

  test('fetch fields', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetFieldsByIssueType>(() =>
        useGetFieldsByIssueType({
          http,
          toastNotifications: notifications.toasts,
          connector,
          issueType: 'Task',
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoading: false,
        fields: {
          summary: { allowedValues: [], defaultValue: {} },
          priority: {
            allowedValues: [
              {
                name: 'Medium',
                id: '3',
              },
            ],
            defaultValue: { name: 'Medium', id: '3' },
          },
        },
      });
    });
  });

  test('unhappy path', async () => {
    const spyOnGetCaseConfigure = jest.spyOn(api, 'getFieldsByIssueType');
    spyOnGetCaseConfigure.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetFieldsByIssueType>(() =>
        useGetFieldsByIssueType({
          http,
          toastNotifications: notifications.toasts,
          connector,
          issueType: null,
        })
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({ isLoading: false, fields: {} });
    });
  });
});
