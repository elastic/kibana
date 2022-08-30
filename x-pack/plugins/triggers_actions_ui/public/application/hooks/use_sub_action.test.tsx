/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useKibana } from '../../common/lib/kibana';
import { useSubAction } from './use_sub_action';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useSubAction', () => {
  const params = {
    connectorId: 'test-id',
    subAction: 'test',
    subActionParams: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.http.post = jest.fn().mockResolvedValue({ status: 'ok', data: {} });
  });

  it('init', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useSubAction(params));
    await waitForNextUpdate();

    expect(result.current).toEqual({
      isError: false,
      isLoading: false,
      response: {},
      error: null,
    });
  });

  it('executes the sub action correctly', async () => {
    const { waitForNextUpdate } = renderHook(() => useSubAction(params));
    await waitForNextUpdate();

    expect(useKibanaMock().services.http.post).toHaveBeenCalledWith(
      '/api/actions/connector/test-id/_execute',
      { body: '{"params":{"subAction":"test","subActionParams":{}}}' }
    );
  });

  it('returns an error correctly', async () => {
    useKibanaMock().services.http.post = jest.fn().mockRejectedValue(new Error('error executing'));

    const { result, waitForNextUpdate } = renderHook(() => useSubAction(params));
    await waitForNextUpdate();

    expect(result.current).toEqual({
      isError: true,
      isLoading: false,
      response: undefined,
      error: expect.anything(),
    });
  });

  it('does not execute if params are null', async () => {
    const { result } = renderHook(() => useSubAction(null));

    expect(useKibanaMock().services.http.post).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      isError: false,
      isLoading: false,
      response: undefined,
      error: null,
    });
  });
});
