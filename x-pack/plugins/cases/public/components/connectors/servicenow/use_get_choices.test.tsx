/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useKibana, useToasts } from '../../../common/lib/kibana';
import type { ActionConnector } from '../../../../common/types/domain';
import { useGetChoices } from './use_get_choices';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import * as api from './api';

jest.mock('./api');
jest.mock('../../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
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
  isDeprecated: false,
  isSystemAction: false,
  config: {
    apiUrl: 'https://dev94428.service-now.com/',
  },
} as ActionConnector;

describe('useGetChoices', () => {
  const { http } = useKibanaMock().services;
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'getChoices');
    const { waitForNextUpdate } = renderHook(
      () =>
        useGetChoices({
          http,
          connector,
          fields,
        }),
      { wrapper: appMockRender.AppWrapper }
    );

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith({
      http,
      signal: expect.anything(),
      connectorId: connector.id,
      fields,
    });
  });

  it('does not call the api when the connector is missing', async () => {
    const spy = jest.spyOn(api, 'getChoices');
    renderHook(
      () =>
        useGetChoices({
          http,
          fields,
        }),
      { wrapper: appMockRender.AppWrapper }
    );

    expect(spy).not.toHaveBeenCalledWith();
  });

  it('calls addError when the getChoices api throws an error', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getChoices');
    spyOnGetCases.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess: jest.fn(), addError });

    const { waitForNextUpdate } = renderHook(
      () =>
        useGetChoices({
          http,
          connector,
          fields,
        }),
      { wrapper: appMockRender.AppWrapper }
    );

    await waitForNextUpdate();
    expect(addError).toHaveBeenCalled();
  });

  it('calls addError when the getChoices api returns successfully but contains an error', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getChoices');
    spyOnGetCases.mockResolvedValue({
      status: 'error',
      message: 'Error message',
      actionId: 'test',
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess: jest.fn(), addError });

    const { waitForNextUpdate } = renderHook(
      () =>
        useGetChoices({
          http,
          connector,
          fields,
        }),
      { wrapper: appMockRender.AppWrapper }
    );

    await waitForNextUpdate();
    expect(addError).toHaveBeenCalled();
  });
});
