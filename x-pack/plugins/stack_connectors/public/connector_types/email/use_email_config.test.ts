/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, notificationServiceMock } from '@kbn/core/public/mocks';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEmailConfig } from './use_email_config';

const http = httpServiceMock.createStartContract();
const toasts = notificationServiceMock.createStartContract().toasts;

const renderUseEmailConfigHook = (currentService?: string) =>
  renderHook(() => useEmailConfig({ http, toasts }));

describe('useEmailConfig', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return the correct result when requesting the config of a service', async () => {
    http.get.mockResolvedValueOnce({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
    });

    const { result } = renderUseEmailConfigHook();
    let res: ReturnType<typeof result.current.getEmailServiceConfig>;
    await act(async () => {
      res = await result.current.getEmailServiceConfig('gmail');
    });

    expect(http.get).toHaveBeenCalledWith('/internal/stack_connectors/_email_config/gmail');
    expect(res).toEqual({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
    });
  });

  it('should return the correct result when requesting the config of a service on partial result', async () => {
    http.get.mockResolvedValueOnce({
      host: 'smtp.gmail.com',
      port: 465,
    });

    const { result } = renderUseEmailConfigHook();

    let res: ReturnType<typeof result.current.getEmailServiceConfig>;
    await act(async () => {
      res = await result.current.getEmailServiceConfig('gmail');
    });

    expect(http.get).toHaveBeenCalledWith('/internal/stack_connectors/_email_config/gmail');
    expect(res).toEqual({
      host: 'smtp.gmail.com',
      port: 465,
      secure: false,
    });
  });

  it('should return the correct result when requesting the config of a service on empty result', async () => {
    http.get.mockResolvedValueOnce({});
    const { result } = renderUseEmailConfigHook();

    let res: ReturnType<typeof result.current.getEmailServiceConfig>;
    await act(async () => {
      res = await result.current.getEmailServiceConfig('foo');
    });

    expect(http.get).toHaveBeenCalledWith('/internal/stack_connectors/_email_config/foo');
    expect(res).toEqual({
      host: '',
      port: 0,
      secure: false,
    });
  });

  it('should show a danger toaster on error', async () => {
    http.get.mockImplementationOnce(() => {
      throw new Error('no!');
    });

    const { result } = renderUseEmailConfigHook();

    await act(async () => {
      result.current.getEmailServiceConfig('foo');
    });

    await waitFor(() => null);
    expect(toasts.addDanger).toHaveBeenCalled();
  });

  it('should not make an API call if the service is empty', async () => {
    http.get.mockResolvedValueOnce({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
    });

    renderUseEmailConfigHook('');
    expect(http.get).not.toHaveBeenCalled();
  });
});
