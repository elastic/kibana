/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useKibana } from '../../../../common/lib/kibana';
import { ActionConnector } from '../../../containers/types';
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
  name: 'ServiceNow',
  isPreconfigured: false,
  config: {
    apiUrl: 'https://dev94428.service-now.com/',
  },
} as ActionConnector;

const getChoicesResponse = [
  {
    dependent_value: '',
    label: 'Priviledge Escalation',
    value: 'Priviledge Escalation',
  },
  {
    dependent_value: '',
    label: 'Criminal activity/investigation',
    value: 'Criminal activity/investigation',
  },
  {
    dependent_value: '',
    label: 'Denial of Service',
    value: 'Denial of Service',
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

  it('init', async () => {
    const { result, waitForNextUpdate } = renderHook<UseGetChoicesProps, UseGetChoices>(() =>
      useGetChoices({
        http: services.http,
        actionConnector,
        toastNotifications: services.notifications.toasts,
        field: 'priority',
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
        field: 'priority',
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
        field: 'priority',
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
        field: 'priority',
        onSuccess,
      })
    );

    await waitForNextUpdate();

    expect(services.notifications.toasts.addDanger).toHaveBeenCalledWith({
      text: 'An error occurred',
      title: 'Unable to get choices for field priority',
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
        field: 'priority',
        onSuccess,
      })
    );

    expect(services.notifications.toasts.addDanger).toHaveBeenCalledWith({
      text: 'An error occurred',
      title: 'Unable to get choices for field priority',
    });
  });
});
