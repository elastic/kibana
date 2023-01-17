/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MutableRefObject } from 'react';
import React from 'react';
import type { RenderHookResult } from '@testing-library/react-hooks';
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
import { inputsActions } from '../../store/actions';
import type { Refetch } from '../../store/inputs/model';
import type { ISessionService } from '@kbn/data-plugin/public';

const state: State = mockGlobalState;

const { storage } = createSecuritySolutionStorageMock();
const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders store={store}>{children}</TestProviders>
);

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  const mockDispatch = jest.fn();
  return {
    ...actual,
    useDispatch: jest.fn().mockReturnValue(mockDispatch),
  };
});

jest.mock('../../lib/kibana', () => {
  return {
    useKibana: jest.fn(),
  };
});

jest.mock('../../store/actions', () => {
  return {
    inputsActions: {
      setInspectionParameter: jest.fn(),
    },
  };
});

describe(`useRefetchByRestartingSession`, () => {
  let res: RenderHookResult<
    {
      children: React.ReactNode;
    },
    {
      session: MutableRefObject<ISessionService>;
      refetchByRestartingSession: Refetch;
    }
  >;
  const mockSessionStart = jest.fn().mockReturnValue('mockSessionId');
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

  beforeEach(() => {
    jest.clearAllMocks();
    res = renderHook(
      () =>
        useRefetchByRestartingSession({
          inputId: InputsModelId.global,
          queryId: 'test',
        }),
      {
        wrapper,
      }
    );
  });

  it('should start a session when clicking refetchByRestartingSession', () => {
    res.result.current.refetchByRestartingSession();
    expect(mockSessionStart).toHaveBeenCalledTimes(1);
    expect(inputsActions.setInspectionParameter).toHaveBeenCalledWith({
      id: 'test',
      selectedInspectIndex: 0,
      isInspected: false,
      inputId: InputsModelId.global,
      searchSessionId: 'mockSessionId',
    });
  });
});
