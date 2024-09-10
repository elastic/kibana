/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useKibana, useToasts } from '../../../common/lib/kibana';
import { connector } from '../mock';
import { useGetFieldsByIssueType } from './use_get_fields_by_issue_type';
import * as api from './api';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';

jest.mock('../../../common/lib/kibana');
jest.mock('./api');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useGetFieldsByIssueType', () => {
  const { http } = useKibanaMock().services;
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'getFieldsByIssueType');
    const { result, waitFor } = renderHook(
      () =>
        useGetFieldsByIssueType({
          http,
          connector,
          issueType: '1',
        }),
      { wrapper: appMockRender.AppWrapper }
    );

    await waitFor(() => result.current.isSuccess);

    expect(spy).toHaveBeenCalledWith({
      http,
      signal: expect.anything(),
      connectorId: connector.id,
      id: '1',
    });
  });

  it('does not call the api when the connector is missing', async () => {
    const spy = jest.spyOn(api, 'getFieldsByIssueType');
    renderHook(
      () =>
        useGetFieldsByIssueType({
          http,
          issueType: '1',
        }),
      { wrapper: appMockRender.AppWrapper }
    );

    expect(spy).not.toHaveBeenCalledWith();
  });

  it('does not call the api when the issueType=null', async () => {
    const spy = jest.spyOn(api, 'getFieldsByIssueType');
    renderHook(
      () =>
        useGetFieldsByIssueType({
          http,
          connector,
          issueType: null,
        }),
      { wrapper: appMockRender.AppWrapper }
    );

    expect(spy).not.toHaveBeenCalledWith();
  });

  it('shows a toast error message when an error occurs', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getFieldsByIssueType');
    spyOnGetCases.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess: jest.fn(), addError });

    const { waitFor } = renderHook(
      () =>
        useGetFieldsByIssueType({
          http,
          connector,
          issueType: '1',
        }),
      { wrapper: appMockRender.AppWrapper }
    );

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });

  it('calls addError when the getFieldsByIssueType api returns successfully but contains an error', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getFieldsByIssueType');
    spyOnGetCases.mockResolvedValue({
      status: 'error',
      message: 'Error message',
      actionId: 'test',
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess: jest.fn(), addError });

    const { waitFor } = renderHook(
      () =>
        useGetFieldsByIssueType({
          http,
          connector,
          issueType: '1',
        }),
      { wrapper: appMockRender.AppWrapper }
    );

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });
});
