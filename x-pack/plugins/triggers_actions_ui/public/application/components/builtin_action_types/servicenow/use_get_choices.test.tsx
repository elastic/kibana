/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useKibana } from '../../../../common/lib/kibana';
import { ActionConnector } from '../../../../types';
import { useGetChoices, UseGetChoices, UseGetChoicesProps } from './use_get_choices';
import { getChoices } from './api';

jest.mock('./api');
jest.mock('../../../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const getChoicesMock = getChoices as jest.Mock;
const onSuccess = jest.fn();

const actionConnector = {
  secrets: {
    username: 'user',
    password: 'pass',
  },
  id: 'test',
  actionTypeId: '.servicenow',
  name: 'ServiceNow ITSM',
  isPreconfigured: false,
  isDeprecated: false,
  config: {
    apiUrl: 'https://dev94428.service-now.com/',
  },
} as ActionConnector;

const getChoicesResponse = [
  {
    dependent_value: '',
    label: 'Priviledge Escalation',
    value: 'Priviledge Escalation',
    element: 'category',
  },
  {
    dependent_value: '',
    label: 'Criminal activity/investigation',
    value: 'Criminal activity/investigation',
    element: 'category',
  },
  {
    dependent_value: '',
    label: 'Denial of Service',
    value: 'Denial of Service',
    element: 'category',
  },
];

describe('useGetChoices', () => {
  const { services } = useKibanaMock();
  getChoicesMock.mockResolvedValue({
    data: getChoicesResponse,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const fields = ['priority'];

  it('init', async () => {
    const { result, waitForNextUpdate } = renderHook<UseGetChoicesProps, UseGetChoices>(() =>
      useGetChoices({
        http: services.http,
        actionConnector,
        toastNotifications: services.notifications.toasts,
        fields,
        onSuccess,
      })
    );

    await waitForNextUpdate();

    expect(result.current).toEqual({
      isLoading: false,
      choices: getChoicesResponse,
    });
  });

  it('returns an empty array when connector is not presented', async () => {
    const { result } = renderHook<UseGetChoicesProps, UseGetChoices>(() =>
      useGetChoices({
        http: services.http,
        actionConnector: undefined,
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
        actionConnector,
        toastNotifications: services.notifications.toasts,
        fields,
        onSuccess,
      })
    );

    await waitForNextUpdate();

    expect(onSuccess).toHaveBeenCalledWith(getChoicesResponse);
  });

  it('it displays an error when service fails', async () => {
    getChoicesMock.mockResolvedValue({
      status: 'error',
      serviceMessage: 'An error occurred',
    });

    const { waitForNextUpdate } = renderHook<UseGetChoicesProps, UseGetChoices>(() =>
      useGetChoices({
        http: services.http,
        actionConnector,
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
    getChoicesMock.mockImplementation(() => {
      throw new Error('An error occurred');
    });

    renderHook<UseGetChoicesProps, UseGetChoices>(() =>
      useGetChoices({
        http: services.http,
        actionConnector,
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

  it('returns an empty array if the response is not an array', async () => {
    getChoicesMock.mockResolvedValue({
      status: 'ok',
      data: {},
    });

    const { result } = renderHook<UseGetChoicesProps, UseGetChoices>(() =>
      useGetChoices({
        http: services.http,
        actionConnector: undefined,
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
});
