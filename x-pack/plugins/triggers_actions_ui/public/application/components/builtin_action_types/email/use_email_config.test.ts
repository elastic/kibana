/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { HttpSetup } from 'kibana/public';
import { useEmailConfig } from './use_email_config';

const http = {
  get: jest.fn(),
};

const editActionConfig = jest.fn();

const renderUseEmailConfigHook = () =>
  renderHook(() => useEmailConfig((http as unknown) as HttpSetup, editActionConfig));

describe('useEmailConfig', () => {
  beforeEach(() => jest.resetAllMocks);

  it('should call get email config API when server type changes and handle result', async () => {
    http.get.mockResolvedValueOnce({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
    });
    const { result, waitForNextUpdate } = renderUseEmailConfigHook();
    await act(async () => {
      result.current.setEmailService('gmail');
      await waitForNextUpdate();
    });

    expect(http.get).toHaveBeenCalledWith('/internal/actions/connector/_email_config/gmail');
    expect(editActionConfig).toHaveBeenCalledWith('service', 'gmail');

    expect(editActionConfig).toHaveBeenCalledWith('host', 'smtp.gmail.com');
    expect(editActionConfig).toHaveBeenCalledWith('port', 465);
    expect(editActionConfig).toHaveBeenCalledWith('secure', true);
  });

  it('should call get email config API when server type changes and handle partial result', async () => {
    http.get.mockResolvedValueOnce({
      host: 'smtp.gmail.com',
      port: 465,
    });
    const { result, waitForNextUpdate } = renderUseEmailConfigHook();
    await act(async () => {
      result.current.setEmailService('gmail');
      await waitForNextUpdate();
    });

    expect(http.get).toHaveBeenCalledWith('/internal/actions/connector/_email_config/gmail');
    expect(editActionConfig).toHaveBeenCalledWith('service', 'gmail');

    expect(editActionConfig).toHaveBeenCalledWith('host', 'smtp.gmail.com');
    expect(editActionConfig).toHaveBeenCalledWith('port', 465);
    expect(editActionConfig).toHaveBeenCalledWith('secure', false);
  });

  it('should call get email config API when server type changes and handle empty result', async () => {
    http.get.mockResolvedValueOnce({});
    const { result, waitForNextUpdate } = renderUseEmailConfigHook();
    await act(async () => {
      result.current.setEmailService('foo');
      await waitForNextUpdate();
    });

    expect(http.get).toHaveBeenCalledWith('/internal/actions/connector/_email_config/foo');
    expect(editActionConfig).toHaveBeenCalledWith('service', 'foo');

    expect(editActionConfig).toHaveBeenCalledWith('host', '');
    expect(editActionConfig).toHaveBeenCalledWith('port', 0);
    expect(editActionConfig).toHaveBeenCalledWith('secure', false);
  });

  it('should call get email config API when server type changes and handle errors', async () => {
    http.get.mockImplementationOnce(() => {
      throw new Error('no!');
    });
    const { result, waitForNextUpdate } = renderUseEmailConfigHook();
    await act(async () => {
      result.current.setEmailService('foo');
      await waitForNextUpdate();
    });

    expect(http.get).toHaveBeenCalledWith('/internal/actions/connector/_email_config/foo');
    expect(editActionConfig).toHaveBeenCalledWith('service', 'foo');

    expect(editActionConfig).toHaveBeenCalledWith('host', '');
    expect(editActionConfig).toHaveBeenCalledWith('port', 0);
    expect(editActionConfig).toHaveBeenCalledWith('secure', false);
  });
});
