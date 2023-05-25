/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useKibana, useToasts } from '../../../common/lib/kibana';
import { connector as actionConnector } from '../mock';
import { useGetIssues } from './use_get_issues';
import * as api from './api';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';

jest.mock('../../../common/lib/kibana');
jest.mock('./api');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useGetIssues', () => {
  const { http } = useKibanaMock().services;
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'getIssues');
    const { result, waitFor } = renderHook(
      () =>
        useGetIssues({
          http,
          actionConnector,
          query: 'Task',
        }),
      { wrapper: appMockRender.AppWrapper }
    );

    await waitFor(() => result.current.isSuccess);

    expect(spy).toHaveBeenCalledWith({
      http,
      signal: expect.anything(),
      connectorId: actionConnector.id,
      title: 'Task',
    });
  });

  it('does not call the api when the connector is missing', async () => {
    const spy = jest.spyOn(api, 'getIssues');
    renderHook(
      () =>
        useGetIssues({
          http,
          actionConnector,
          query: 'Task',
        }),
      { wrapper: appMockRender.AppWrapper }
    );

    expect(spy).not.toHaveBeenCalledWith();
  });

  it('calls addError when the getIssues api throws an error', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getIssues');
    spyOnGetCases.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess: jest.fn(), addError });

    const { result, waitFor } = renderHook(
      () =>
        useGetIssues({
          http,
          actionConnector,
          query: 'Task',
        }),
      { wrapper: appMockRender.AppWrapper }
    );

    await waitFor(() => result.current.isError);

    expect(addError).toHaveBeenCalled();
  });

  it('calls addError when the getIssues api returns successfully but contains an error', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getIssues');
    spyOnGetCases.mockResolvedValue({
      status: 'error',
      message: 'Error message',
      actionId: 'test',
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess: jest.fn(), addError });

    const { result, waitFor } = renderHook(
      () =>
        useGetIssues({
          http,
          actionConnector,
          query: 'Task',
        }),
      { wrapper: appMockRender.AppWrapper }
    );

    await waitFor(() => result.current.isSuccess);

    expect(addError).toHaveBeenCalled();
  });
});
