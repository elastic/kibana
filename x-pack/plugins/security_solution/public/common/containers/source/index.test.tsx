/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexField } from '../../../../common/search_strategy/index_fields';
import { useDataView } from './use_data_view';
import { getBrowserFields, getAllBrowserFields } from '.';
import { mockBrowserFields, mocksSource } from './mock';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { createStore, State } from '../../store';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../mock';
import { act, renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import React from 'react';
import { useKibana } from '../../lib/kibana';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
jest.mock('../../lib/kibana');

describe('source/index.tsx', () => {
  describe('getAllBrowserFields', () => {
    test('it returns an array of all fields in the BrowserFields argument', () => {
      expect(getAllBrowserFields(mockBrowserFields)).toMatchSnapshot();
    });
  });
  describe('getBrowserFields', () => {
    test('it returns an empty object given an empty array', () => {
      const fields = getBrowserFields('title 1', []);
      expect(fields).toEqual({});
    });

    test('it returns the same input given the same title and same fields length', () => {
      const oldFields = getBrowserFields('title 1', mocksSource.indexFields as IndexField[]);
      const newFields = getBrowserFields('title 1', mocksSource.indexFields as IndexField[]);
      // Since it is memoized it will return the same object instance
      expect(newFields).toBe(oldFields);
    });

    test('it transforms input into output as expected', () => {
      const fields = getBrowserFields('title 2', mocksSource.indexFields as IndexField[]);
      expect(fields).toEqual(mockBrowserFields);
    });
  });
  describe('useDataView hook', () => {
    const sourcererState = mockGlobalState.sourcerer;
    const state: State = {
      ...mockGlobalState,
      sourcerer: {
        ...sourcererState,
        kibanaDataViews: [
          ...sourcererState.kibanaDataViews,
          {
            ...sourcererState.defaultDataView,
            id: 'something-random',
            title: 'something,random',
            patternList: ['something', 'random'],
          },
        ],
        sourcererScopes: {
          ...sourcererState.sourcererScopes,
          [SourcererScopeName.default]: {
            ...sourcererState.sourcererScopes[SourcererScopeName.default],
          },
          [SourcererScopeName.detections]: {
            ...sourcererState.sourcererScopes[SourcererScopeName.detections],
          },
          [SourcererScopeName.timeline]: {
            ...sourcererState.sourcererScopes[SourcererScopeName.timeline],
          },
        },
      },
    };
    const mockSearchResponse = {
      ...mocksSource,
      indicesExist: ['auditbeat-*', sourcererState.signalIndexName],
      isRestore: false,
      rawResponse: {},
      runtimeMappings: {},
    };
    const { storage } = createSecuritySolutionStorageMock();
    const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

    beforeEach(() => {
      jest.clearAllMocks();
      const mock = {
        subscribe: ({ next }: { next: Function }) => next(mockSearchResponse),
        unsubscribe: jest.fn(),
      };

      (useKibana as jest.Mock).mockReturnValue({
        services: {
          data: {
            search: {
              search: jest.fn().mockReturnValue({
                subscribe: ({ next }: { next: Function }) => {
                  next(mockSearchResponse);
                  return mock;
                },
                unsubscribe: jest.fn(),
              }),
            },
          },
        },
      });
    });
    it('sets field data for data view', async () => {
      await act(async () => {
        const { rerender, waitForNextUpdate, result } = renderHook<
          string,
          { indexFieldsSearch: (id: string) => Promise<void> }
        >(() => useDataView(), {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        });
        await waitForNextUpdate();
        rerender();
        await result.current.indexFieldsSearch('neato');
      });
      expect(mockDispatch.mock.calls[0][0]).toEqual({
        type: 'x-pack/security_solution/local/sourcerer/SET_DATA_VIEW_LOADING',
        payload: { id: 'neato', loading: true },
      });
      const { type: sourceType, payload } = mockDispatch.mock.calls[1][0];
      expect(sourceType).toEqual('x-pack/security_solution/local/sourcerer/SET_DATA_VIEW');
      expect(payload.id).toEqual('neato');
      expect(Object.keys(payload.browserFields)).toHaveLength(12);
      expect(payload.docValueFields).toEqual([{ field: '@timestamp' }]);
    });
  });
});
