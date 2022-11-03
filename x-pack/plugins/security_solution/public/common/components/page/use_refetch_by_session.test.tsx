/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { tGridReducer } from '@kbn/timelines-plugin/public';
import { renderHook } from '@testing-library/react-hooks';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../mock';
import type { State } from '../../store';
import { createStore } from '../../store';
import { useKibana } from '../../lib/kibana';
import { InputsModelId } from '../../store/inputs/constants';
import { useRefetchByRestartingSession } from './use_refetch_by_session';

const state: State = mockGlobalState;

const { storage } = createSecuritySolutionStorageMock();
const store = createStore(
  state,
  SUB_PLUGINS_REDUCER,
  { dataTable: tGridReducer },
  kibanaObservable,
  storage
);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders store={store}>{children}</TestProviders>
);

jest.mock('../../lib/kibana', () => {
  return {
    useKibana: jest.fn(),
  };
});

describe(`useRefetchByRestartingSession`, () => {
  const mockSessionStart = jest
    .fn()
    .mockReturnValueOnce('mockSessionId')
    .mockReturnValue('mockSessionIdDefault');
  const mockSession = {
    start: mockSessionStart,
  };
  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          search: {
            session: mockSession,
          },
        },
      },
    });
  });

  it('should start a session', () => {
    const { result } = renderHook(
      () =>
        useRefetchByRestartingSession({
          inputId: InputsModelId.global,
          queryId: 'test',
        }),
      {
        wrapper,
      }
    );

    expect(mockSessionStart).toHaveBeenCalledTimes(1);
    expect(result.current.searchSessionId).toBe('mockSessionId');
  });
});
