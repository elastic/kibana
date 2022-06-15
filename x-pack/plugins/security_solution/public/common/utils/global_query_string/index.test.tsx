/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { registerUrlParam, updateUrlParam, useGlobalQueryString } from '.';
import { globalUrlParamActions } from '../../store/global_url_param';
import { mockHistory } from '../route/mocks';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../mock';
import { createStore } from '../../store';

const mockGetState = jest.fn();
const mockDispatch = jest.fn();
const mockedStore = {
  dispatch: mockDispatch,
  getState: mockGetState,
};
jest.mock('../../store', () => ({
  ...jest.requireActual('../../store'),
  getStore: () => mockedStore,
}));

describe('global query string', () => {
  beforeAll(() => {
    // allow window.location.search to be redefined
    Object.defineProperty(window, 'location', {
      value: {
        search: '?',
      },
    });
  });
  beforeEach(() => {
    mockDispatch.mockRestore();
    mockGetState.mockRestore();
    mockHistory.replace.mockRestore();
    window.location.search = '?';
  });
  describe('registerUrlParam', () => {
    it('returns decoded URL param value', () => {
      const urlParamKey = 'testKey';
      window.location.search = `?testKey=(test:(value:123))`;

      const result = registerUrlParam({ urlParamKey });

      expect(result).toEqual({ test: { value: 123 } });
    });

    it('calls registerUrlParam global URL param action', () => {
      const urlParamKey = 'testKey';
      const initialValue = 123;
      window.location.search = `?testKey=${initialValue}`;

      registerUrlParam({ urlParamKey });

      expect(mockDispatch).toBeCalledWith(
        globalUrlParamActions.registerUrlParam({
          key: urlParamKey,
          initialValue: initialValue.toString(),
        })
      );
    });
  });

  describe('updateUrlParam', () => {
    it("doesn't update the URL if the params isn't registered", () => {
      const urlParamKey = 'testKey';
      const value = 123;
      const history = mockHistory;

      mockGetState.mockReturnValue({
        globalUrlParam: {
          [urlParamKey]: undefined,
        },
      });

      updateUrlParam({ urlParamKey, value, history });

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(history.replace).not.toHaveBeenCalled();
    });

    it('updates the URL', () => {
      const urlParamKey = 'testKey';
      const value = { test: 123 };
      const encodedVaue = '(test:123)';
      const history = mockHistory;

      mockGetState.mockReturnValue({
        globalUrlParam: {
          [urlParamKey]: 'oldValue',
        },
      });

      updateUrlParam({ urlParamKey, value, history });

      expect(mockDispatch).toBeCalledWith(
        globalUrlParamActions.updateUrlParam({
          key: urlParamKey,
          value: encodedVaue,
        })
      );

      expect(history.replace).toHaveBeenCalledWith({ search: `${urlParamKey}=${encodedVaue}` });
    });

    it("doesn't delete other URL params when updating one", () => {
      const urlParamKey = 'testKey';
      const value = 123;
      window.location.search = `?firstKey=111&${urlParamKey}=oldValue&lastKey=999`;

      mockGetState.mockReturnValue({
        globalUrlParam: {
          [urlParamKey]: 'oldValue',
        },
      });

      updateUrlParam({ urlParamKey, value, history: mockHistory });

      expect(mockHistory.replace).toHaveBeenCalledWith({
        search: `firstKey=111&${urlParamKey}=${value}&lastKey=999`,
      });
    });

    it('removes URL param when value is null', () => {
      const urlParamKey = 'testKey';
      const value = null;
      const history = mockHistory;

      mockGetState.mockReturnValue({
        globalUrlParam: {
          [urlParamKey]: 'oldValue',
        },
      });

      updateUrlParam({ urlParamKey, value, history });

      expect(mockDispatch).toBeCalledWith(
        globalUrlParamActions.updateUrlParam({
          key: urlParamKey,
          value,
        })
      );

      expect(history.replace).toHaveBeenCalledWith({ search: `` });
    });
  });

  describe('useGlobalQueryString', () => {
    it('returns global query string', () => {
      const { storage } = createSecuritySolutionStorageMock();
      const store = createStore(
        {
          ...mockGlobalState,
          globalUrlParam: {
            testNumber: '123',
            testObject: '(test:321)',
            testNull: null,
            testEmpty: '',
          },
        },
        SUB_PLUGINS_REDUCER,
        kibanaObservable,
        storage
      );
      const wrapper = ({ children }: { children: React.ReactElement }) => (
        <TestProviders store={store}>{children}</TestProviders>
      );

      const { result } = renderHook(() => useGlobalQueryString(), { wrapper });

      expect(result.current).toEqual('testNumber=123&testObject=(test:321)');
    });
  });
});
