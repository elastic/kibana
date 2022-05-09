/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useActionTypes, UseActionTypesResponse } from './use_action_types';
import * as api from './api';
import { actionTypesMock } from '../../common/mock/connectors';

jest.mock('./api');
jest.mock('../../common/lib/kibana');

describe('useActionTypes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseActionTypesResponse>(() =>
        useActionTypes()
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        loading: true,
        actionTypes: [],
        refetchActionTypes: result.current.refetchActionTypes,
      });
    });
  });

  test('fetch action types', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseActionTypesResponse>(() =>
        useActionTypes()
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({
        loading: false,
        actionTypes: actionTypesMock,
        refetchActionTypes: result.current.refetchActionTypes,
      });
    });
  });

  test('refetch actionTypes', async () => {
    const spyOnfetchActionTypes = jest.spyOn(api, 'fetchActionTypes');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseActionTypesResponse>(() =>
        useActionTypes()
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      result.current.refetchActionTypes();
      expect(spyOnfetchActionTypes).toHaveBeenCalledTimes(2);
    });
  });

  test('set isLoading to true when refetching actionTypes', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseActionTypesResponse>(() =>
        useActionTypes()
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      result.current.refetchActionTypes();

      expect(result.current.loading).toBe(true);
    });
  });

  test('unhappy path', async () => {
    const spyOnfetchActionTypes = jest.spyOn(api, 'fetchActionTypes');
    spyOnfetchActionTypes.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseActionTypesResponse>(() =>
        useActionTypes()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({
        loading: false,
        actionTypes: [],
        refetchActionTypes: result.current.refetchActionTypes,
      });
    });
  });
});
