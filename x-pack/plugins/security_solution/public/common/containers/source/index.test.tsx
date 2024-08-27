/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import type { IndexFieldSearch } from './use_data_view';
import { useDataView } from './use_data_view';
import { mocksSource } from './mock';
import { mockGlobalState, TestProviders } from '../../mock';
import { renderHook, act } from '@testing-library/react';
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
jest.mock('../../lib/apm/use_track_http_request');

describe('source/index.tsx', () => {
  describe('useDataView hook', () => {
    const mockSearchResponse = {
      ...mocksSource,
      indicesExist: ['auditbeat-*', mockGlobalState.sourcerer.signalIndexName],
      isRestore: false,
      rawResponse: {},
      runtimeMappings: {},
    };

    beforeEach(() => {
      jest.clearAllMocks();
      const mock = {
        subscribe: ({ next }: { next: Function }) => next(mockSearchResponse),
        unsubscribe: jest.fn(),
      };

      (useKibana as jest.Mock).mockReturnValue({
        services: {
          data: {
            dataViews: {
              ...useKibana().services.data.dataViews,
              get: async (dataViewId: string, displayErrors?: boolean, refreshFields = false) => {
                const dataViewMock = {
                  id: dataViewId,
                  matchedIndices: refreshFields
                    ? ['hello', 'world', 'refreshed']
                    : ['hello', 'world'],
                  fields: mocksSource.indexFields,
                  getIndexPattern: () =>
                    refreshFields ? 'hello*,world*,refreshed*' : 'hello*,world*',
                  getRuntimeMappings: () => ({
                    myfield: {
                      type: 'keyword',
                    },
                  }),
                };
                return Promise.resolve({
                  toSpec: () => dataViewMock,
                  ...dataViewMock,
                });
              },
              getFieldsForWildcard: async () => Promise.resolve(),
              getExistingIndices: async (indices: string[]) => Promise.resolve(indices),
            },
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
        const { waitForNextUpdate, result } = renderHook<
          PropsWithChildren<{}>,
          { indexFieldsSearch: IndexFieldSearch }
        >(() => useDataView(), {
          wrapper: TestProviders,
        });
        await waitForNextUpdate();
        await result.current.indexFieldsSearch({ dataViewId: 'neato' });
      });
      expect(mockDispatch.mock.calls[0][0]).toEqual({
        type: 'x-pack/security_solution/local/sourcerer/SET_DATA_VIEW_LOADING',
        payload: { id: 'neato', loading: true },
      });
      const { type: sourceType, payload } = mockDispatch.mock.calls[1][0];
      expect(sourceType).toEqual('x-pack/security_solution/local/sourcerer/SET_DATA_VIEW');
      expect(payload.id).toEqual('neato');
    });

    it('should reuse the result for dataView info when cleanCache not passed', async () => {
      let indexFieldsSearch: IndexFieldSearch;
      await act(async () => {
        const { waitForNextUpdate, result } = renderHook<
          PropsWithChildren<{}>,
          { indexFieldsSearch: IndexFieldSearch }
        >(() => useDataView(), {
          wrapper: TestProviders,
        });
        await waitForNextUpdate();
        indexFieldsSearch = result.current.indexFieldsSearch;
      });

      await indexFieldsSearch!({ dataViewId: 'neato' });
      const {
        payload: { browserFields, indexFields },
      } = mockDispatch.mock.calls[1][0];

      mockDispatch.mockClear();

      await indexFieldsSearch!({ dataViewId: 'neato' });
      const {
        payload: { browserFields: newBrowserFields, indexFields: newIndexFields },
      } = mockDispatch.mock.calls[1][0];

      expect(browserFields).toBe(newBrowserFields);
      expect(indexFields).toBe(newIndexFields);
    });

    it('should not reuse the result for dataView info when cleanCache passed', async () => {
      let indexFieldsSearch: IndexFieldSearch;
      await act(async () => {
        const { waitForNextUpdate, result } = renderHook<
          PropsWithChildren<{}>,
          { indexFieldsSearch: IndexFieldSearch }
        >(() => useDataView(), {
          wrapper: TestProviders,
        });
        await waitForNextUpdate();
        indexFieldsSearch = result.current.indexFieldsSearch;
      });

      await indexFieldsSearch!({ dataViewId: 'neato' });
      const {
        payload: { patternList },
      } = mockDispatch.mock.calls[1][0];

      mockDispatch.mockClear();

      await indexFieldsSearch!({ dataViewId: 'neato', cleanCache: true });
      const {
        payload: { patternList: newPatternList },
      } = mockDispatch.mock.calls[1][0];
      expect(patternList).not.toBe(newPatternList);
      expect(patternList).not.toContain('refreshed*');
      expect(newPatternList).toContain('refreshed*');
    });
  });
});
