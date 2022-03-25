/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useKibana } from '../../../common/lib/kibana';
import { ActionConnector } from '../../../../common/api';
import { choices } from '../mock';
import { useGetChoices, UseGetChoices, UseGetChoicesProps } from './use_get_choices';
import * as api from './api';

jest.mock('./api');
jest.mock('../../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const onSuccess = jest.fn();
const fields = ['priority'];

const connector = {
  secrets: {
    username: 'user',
    password: 'pass',
  },
  id: 'test',
  actionTypeId: '.servicenow',
  name: 'ServiceNow',
  isPreconfigured: false,
  config: {
    apiUrl: 'https://dev94428.service-now.com/',
  },
} as ActionConnector;

describe('useGetChoices', () => {
  const { services } = useKibanaMock();
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    const { result, waitForNextUpdate } = renderHook<UseGetChoicesProps, UseGetChoices>(() =>
      useGetChoices({
        http: services.http,
        connector,
        toastNotifications: services.notifications.toasts,
        fields,
        onSuccess,
      })
    );

    await waitForNextUpdate();

    expect(result.current).toEqual({
      isLoading: false,
      choices,
    });
  });

  it('returns an empty array when connector is not presented', async () => {
    const { result } = renderHook<UseGetChoicesProps, UseGetChoices>(() =>
      useGetChoices({
        http: services.http,
        connector: undefined,
        toastNotifications: services.notifications.toasts,
        fields,
        onSuccess,
      })
    );

    expect(result.current).toEqual({
      isLoading: false,
      choices: [],
    });
  });

  it('it calls onSuccess', async () => {
    const { waitForNextUpdate } = renderHook<UseGetChoicesProps, UseGetChoices>(() =>
      useGetChoices({
        http: services.http,
        connector,
        toastNotifications: services.notifications.toasts,
        fields,
        onSuccess,
      })
    );

    await waitForNextUpdate();

    expect(onSuccess).toHaveBeenCalledWith(choices);
  });

  it('it displays an error when service fails', async () => {
    const spyOnGetChoices = jest.spyOn(api, 'getChoices');
    spyOnGetChoices.mockResolvedValue(
      Promise.resolve({
        actionId: 'test',
        status: 'error',
        serviceMessage: 'An error occurred',
      })
    );

    const { waitForNextUpdate } = renderHook<UseGetChoicesProps, UseGetChoices>(() =>
      useGetChoices({
        http: services.http,
        connector,
        toastNotifications: services.notifications.toasts,
        fields,
        onSuccess,
      })
    );

    await waitForNextUpdate();

    expect(services.notifications.toasts.addDanger).toHaveBeenCalledWith({
      text: 'An error occurred',
      title: 'Unable to get choices',
    });
  });

  it('it displays an error when http throws an error', async () => {
    const spyOnGetChoices = jest.spyOn(api, 'getChoices');
    spyOnGetChoices.mockImplementation(() => {
      throw new Error('An error occurred');
    });

    renderHook<UseGetChoicesProps, UseGetChoices>(() =>
      useGetChoices({
        http: services.http,
        connector,
        toastNotifications: services.notifications.toasts,
        fields,
        onSuccess,
      })
    );

    expect(services.notifications.toasts.addDanger).toHaveBeenCalledWith({
      text: 'An error occurred',
      title: 'Unable to get choices',
    });
  });
});
