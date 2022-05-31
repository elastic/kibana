/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useKibana } from '../../../../common/lib/kibana';
import { getApplication } from './api';
import { SwimlaneActionConnector } from './types';
import { useGetApplication, UseGetApplication } from './use_get_application';

jest.mock('./api');
jest.mock('../../../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const getApplicationMock = getApplication as jest.Mock;

const action = {
  secrets: { apiToken: 'token' },
  id: 'test',
  actionTypeId: '.swimlane',
  name: 'Swimlane',
  isPreconfigured: false,
  isDeprecated: false,
  config: {
    apiUrl: 'https://test.swimlane.com/',
    appId: 'bcq16kdTbz5jlwM6h',
    mappings: {},
  },
} as SwimlaneActionConnector;

describe('useGetApplication', () => {
  const { services } = useKibanaMock();
  getApplicationMock.mockResolvedValue({
    data: { fields: [] },
  });
  const abortCtrl = new AbortController();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetApplication>(() =>
        useGetApplication({
          appId: action.config.appId,
          apiToken: action.secrets.apiToken,
          apiUrl: action.config.apiUrl,
          toastNotifications: services.notifications.toasts,
        })
      );

      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoading: false,
        getApplication: result.current.getApplication,
      });
    });
  });

  it('calls getApplication with correct arguments', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetApplication>(() =>
        useGetApplication({
          appId: action.config.appId,
          apiToken: action.secrets.apiToken,
          apiUrl: action.config.apiUrl,
          toastNotifications: services.notifications.toasts,
        })
      );

      await waitForNextUpdate();

      result.current.getApplication();
      await waitForNextUpdate();
      expect(getApplicationMock).toBeCalledWith({
        signal: abortCtrl.signal,
        appId: action.config.appId,
        apiToken: action.secrets.apiToken,
        url: action.config.apiUrl,
      });
    });
  });

  it('get application', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetApplication>(() =>
        useGetApplication({
          appId: action.config.appId,
          apiToken: action.secrets.apiToken,
          apiUrl: action.config.apiUrl,
          toastNotifications: services.notifications.toasts,
        })
      );

      await waitForNextUpdate();
      result.current.getApplication();
      await waitForNextUpdate();

      expect(result.current).toEqual({
        isLoading: false,
        getApplication: result.current.getApplication,
      });
    });
  });

  it('set isLoading to true when getting the application', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetApplication>(() =>
        useGetApplication({
          appId: action.config.appId,
          apiToken: action.secrets.apiToken,
          apiUrl: action.config.apiUrl,
          toastNotifications: services.notifications.toasts,
        })
      );

      await waitForNextUpdate();
      result.current.getApplication();

      expect(result.current.isLoading).toBe(true);
    });
  });

  it('it displays an error when http throws an error', async () => {
    getApplicationMock.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetApplication>(() =>
        useGetApplication({
          appId: action.config.appId,
          apiToken: action.secrets.apiToken,
          apiUrl: action.config.apiUrl,
          toastNotifications: services.notifications.toasts,
        })
      );
      await waitForNextUpdate();
      result.current.getApplication();

      expect(result.current).toEqual({
        isLoading: false,
        getApplication: result.current.getApplication,
      });

      expect(services.notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: 'Unable to get application with id bcq16kdTbz5jlwM6h',
        text: 'Something went wrong',
      });
    });
  });

  it('it displays an error when the response does not contain the correct fields', async () => {
    getApplicationMock.mockResolvedValue({});

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetApplication>(() =>
        useGetApplication({
          appId: action.config.appId,
          apiToken: action.secrets.apiToken,
          apiUrl: action.config.apiUrl,
          toastNotifications: services.notifications.toasts,
        })
      );
      await waitForNextUpdate();
      result.current.getApplication();
      await waitForNextUpdate();

      expect(services.notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: 'Unable to get application with id bcq16kdTbz5jlwM6h',
        text: 'Unable to get application fields',
      });
    });
  });
});
