/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../mock';
import { act, renderHook } from '@testing-library/react-hooks';
import { useSignalHelpers } from './use_signal_helpers';
import { createStore, State } from '../../store';

describe('useSignalHelpers', () => {
  const wrapperContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  );

  test('Default state, does not need init and does not need poll', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useSignalHelpers(), {
        wrapper: wrapperContainer,
      });
      await waitForNextUpdate();
      expect(result.current.signalIndexNeedsInit).toEqual(false);
      expect(result.current.pollForSignalIndex).toEqual(undefined);
    });
  });
  test('Needs init and does not need poll when signal index is not yet in default data view', async () => {
    const state: State = {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        defaultDataView: {
          ...mockGlobalState.sourcerer.defaultDataView,
          title: `auditbeat-*,packetbeat-*`,
          patternList: ['packetbeat-*', 'auditbeat-*'],
        },
        kibanaDataViews: [
          {
            ...mockGlobalState.sourcerer.defaultDataView,
            title: `auditbeat-*,packetbeat-*`,
            patternList: ['packetbeat-*', 'auditbeat-*'],
          },
        ],
      },
    };
    const { storage } = createSecuritySolutionStorageMock();
    const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useSignalHelpers(), {
        wrapper: ({ children }) => <TestProviders store={store}>{children}</TestProviders>,
      });
      await waitForNextUpdate();
      expect(result.current.signalIndexNeedsInit).toEqual(true);
      expect(result.current.pollForSignalIndex).toEqual(undefined);
    });
  });
  test('Init happened and signal index does not have data yet, poll function becomes available', async () => {
    const state: State = {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        defaultDataView: {
          ...mockGlobalState.sourcerer.defaultDataView,
          title: `auditbeat-*,packetbeat-*,${mockGlobalState.sourcerer.signalIndexName}`,
          patternList: ['packetbeat-*', 'auditbeat-*'],
        },
        kibanaDataViews: [
          {
            ...mockGlobalState.sourcerer.defaultDataView,
            title: `auditbeat-*,packetbeat-*,${mockGlobalState.sourcerer.signalIndexName}`,
            patternList: ['packetbeat-*', 'auditbeat-*'],
          },
        ],
      },
    };
    const { storage } = createSecuritySolutionStorageMock();
    const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useSignalHelpers(), {
        wrapper: ({ children }) => <TestProviders store={store}>{children}</TestProviders>,
      });
      await waitForNextUpdate();
      expect(result.current.signalIndexNeedsInit).toEqual(false);
      expect(result.current.pollForSignalIndex).not.toEqual(undefined);
    });
  });
});
