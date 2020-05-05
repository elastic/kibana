/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { initialData, useGetActionLicense, ActionLicenseState } from './use_get_action_license';
import { actionLicenses } from './mock';
import * as api from './api';

jest.mock('./api');

describe('useGetActionLicense', () => {
  const abortCtrl = new AbortController();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ActionLicenseState>(() =>
        useGetActionLicense()
      );
      await waitForNextUpdate();
      expect(result.current).toEqual(initialData);
    });
  });

  it('calls getActionLicense with correct arguments', async () => {
    const spyOnGetActionLicense = jest.spyOn(api, 'getActionLicense');

    await act(async () => {
      const { waitForNextUpdate } = renderHook<string, ActionLicenseState>(() =>
        useGetActionLicense()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(spyOnGetActionLicense).toBeCalledWith(abortCtrl.signal);
    });
  });

  it('gets action license', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ActionLicenseState>(() =>
        useGetActionLicense()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoading: false,
        isError: false,
        actionLicense: actionLicenses[0],
      });
    });
  });

  it('set isLoading to true when posting case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ActionLicenseState>(() =>
        useGetActionLicense()
      );
      await waitForNextUpdate();
      expect(result.current.isLoading).toBe(true);
    });
  });

  it('unhappy path', async () => {
    const spyOnGetActionLicense = jest.spyOn(api, 'getActionLicense');
    spyOnGetActionLicense.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ActionLicenseState>(() =>
        useGetActionLicense()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({
        actionLicense: null,
        isLoading: false,
        isError: true,
      });
    });
  });
});
