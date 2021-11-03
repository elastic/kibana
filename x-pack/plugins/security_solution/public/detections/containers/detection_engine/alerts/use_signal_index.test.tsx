/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { TestProvidersWithPrivileges } from '../../../../common/mock';
import { useSignalIndex, ReturnSignalIndex } from './use_signal_index';
import * as api from './api';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

jest.mock('./api');
jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../../../common/components/user_privileges/endpoint/use_endpoint_privileges');

describe('useSignalIndex', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
  });

  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnSignalIndex>(
        () => useSignalIndex(),
        {
          wrapper: TestProvidersWithPrivileges,
        }
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        createDeSignalIndex: null,
        loading: true,
        signalIndexExists: null,
        signalIndexName: null,
        signalIndexMappingOutdated: null,
      });
    });
  });

  test('fetch alerts info', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnSignalIndex>(
        () => useSignalIndex(),
        {
          wrapper: TestProvidersWithPrivileges,
        }
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        createDeSignalIndex: result.current.createDeSignalIndex,
        loading: false,
        signalIndexExists: true,
        signalIndexName: 'mock-signal-index',
        signalIndexMappingOutdated: false,
      });
    });
  });

  test('make sure that createSignalIndex is giving back the signal info', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnSignalIndex>(
        () => useSignalIndex(),
        {
          wrapper: TestProvidersWithPrivileges,
        }
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      await waitForNextUpdate();
      if (result.current.createDeSignalIndex != null) {
        await result.current.createDeSignalIndex();
      }
      await waitForNextUpdate();
      expect(result.current).toEqual({
        createDeSignalIndex: result.current.createDeSignalIndex,
        loading: false,
        signalIndexExists: true,
        signalIndexName: 'mock-signal-index',
        signalIndexMappingOutdated: false,
      });
    });
  });

  test('make sure that createSignalIndex have been called when trying to create signal index', async () => {
    const spyOnCreateSignalIndex = jest.spyOn(api, 'createSignalIndex');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnSignalIndex>(
        () => useSignalIndex(),
        {
          wrapper: TestProvidersWithPrivileges,
        }
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      await waitForNextUpdate();
      if (result.current.createDeSignalIndex != null) {
        await result.current.createDeSignalIndex();
      }
      await waitForNextUpdate();
      expect(spyOnCreateSignalIndex).toHaveBeenCalledTimes(1);
    });
  });

  test('if there is an error during createSignalIndex, we should get back signalIndexExists === false && signalIndexName == null', async () => {
    const spyOnCreateSignalIndex = jest.spyOn(api, 'createSignalIndex');
    spyOnCreateSignalIndex.mockImplementation(() => {
      throw new Error('Something went wrong, let see what happen');
    });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnSignalIndex>(
        () => useSignalIndex(),
        {
          wrapper: TestProvidersWithPrivileges,
        }
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      await waitForNextUpdate();
      if (result.current.createDeSignalIndex != null) {
        await result.current.createDeSignalIndex();
      }
      expect(result.current).toEqual({
        createDeSignalIndex: result.current.createDeSignalIndex,
        loading: false,
        signalIndexExists: false,
        signalIndexName: null,
        signalIndexMappingOutdated: null,
      });
    });
  });

  test('if there is an error when fetching alerts info, signalIndexExists === false && signalIndexName == null', async () => {
    const spyOnGetSignalIndex = jest.spyOn(api, 'getSignalIndex');
    spyOnGetSignalIndex.mockImplementation(() => {
      throw new Error('Something went wrong, let see what happen');
    });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnSignalIndex>(
        () => useSignalIndex(),
        {
          wrapper: TestProvidersWithPrivileges,
        }
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        createDeSignalIndex: result.current.createDeSignalIndex,
        loading: false,
        signalIndexExists: false,
        signalIndexName: null,
        signalIndexMappingOutdated: null,
      });
    });
  });
});
