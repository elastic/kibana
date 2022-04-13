/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useGetAppInfo, UseGetAppInfo, UseGetAppInfoProps } from './use_get_app_info';
import { getAppInfo } from './api';
import { ServiceNowActionConnector } from './types';

jest.mock('./api');
jest.mock('../../../../common/lib/kibana');

const getAppInfoMock = getAppInfo as jest.Mock;

const actionTypeId = '.servicenow';
const applicationInfoData = {
  name: 'Elastic',
  scope: 'x_elas2_inc_int',
  version: '1.0.0',
};

const actionConnector = {
  secrets: {
    username: 'user',
    password: 'pass',
  },
  id: 'test',
  actionTypeId: '.servicenow',
  name: 'ServiceNow ITSM',
  isPreconfigured: false,
  config: {
    apiUrl: 'https://test.service-now.com/',
    usesTableApi: false,
  },
} as ServiceNowActionConnector;

describe('useGetAppInfo', () => {
  getAppInfoMock.mockResolvedValue(applicationInfoData);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    const { result } = renderHook<UseGetAppInfoProps, UseGetAppInfo>(() =>
      useGetAppInfo({
        actionTypeId,
      })
    );

    expect(result.current).toEqual({
      isLoading: false,
      fetchAppInfo: result.current.fetchAppInfo,
    });
  });

  it('returns the application information', async () => {
    const { result } = renderHook<UseGetAppInfoProps, UseGetAppInfo>(() =>
      useGetAppInfo({
        actionTypeId,
      })
    );

    let res;

    await act(async () => {
      res = await result.current.fetchAppInfo(actionConnector);
    });

    expect(res).toEqual(applicationInfoData);
  });

  it('it throws an error when api fails', async () => {
    expect.assertions(1);
    getAppInfoMock.mockImplementation(() => {
      throw new Error('An error occurred');
    });

    const { result } = renderHook<UseGetAppInfoProps, UseGetAppInfo>(() =>
      useGetAppInfo({
        actionTypeId,
      })
    );

    await expect(() =>
      act(async () => {
        await result.current.fetchAppInfo(actionConnector);
      })
    ).rejects.toThrow('An error occurred');
  });
});
