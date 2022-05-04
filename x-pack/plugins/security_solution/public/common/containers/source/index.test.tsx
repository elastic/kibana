/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexField } from '../../../../common/search_strategy/index_fields';
import { getBrowserFields, getAllBrowserFields } from '.';
import { IndexFieldSearch, useDataView } from './use_data_view';
import { mockBrowserFields, mocksSource } from './mock';
import { mockGlobalState, TestProviders } from '../../mock';
import { act, renderHook } from '@testing-library/react-hooks';
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
          string,
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
      expect(Object.keys(payload.browserFields)).toHaveLength(12);
      expect(Object.keys(payload.indexFields)).toHaveLength(mocksSource.indexFields.length);
      expect(payload.docValueFields).toEqual([{ field: '@timestamp' }]);
    });

    it('should reuse the result for dataView info when cleanCache not passed', async () => {
      let indexFieldsSearch: IndexFieldSearch;
      await act(async () => {
        const { waitForNextUpdate, result } = renderHook<
          string,
          { indexFieldsSearch: IndexFieldSearch }
        >(() => useDataView(), {
          wrapper: TestProviders,
        });
        await waitForNextUpdate();
        indexFieldsSearch = result.current.indexFieldsSearch;
      });

      await indexFieldsSearch!({ dataViewId: 'neato' });
      const {
        payload: { browserFields, indexFields, docValueFields },
      } = mockDispatch.mock.calls[1][0];

      mockDispatch.mockClear();

      await indexFieldsSearch!({ dataViewId: 'neato' });
      const {
        payload: {
          browserFields: newBrowserFields,
          indexFields: newIndexFields,
          docValueFields: newDocValueFields,
        },
      } = mockDispatch.mock.calls[1][0];

      expect(browserFields).toBe(newBrowserFields);
      expect(indexFields).toBe(newIndexFields);
      expect(docValueFields).toBe(newDocValueFields);
    });

    it('should not reuse the result for dataView info when cleanCache passed', async () => {
      let indexFieldsSearch: IndexFieldSearch;
      await act(async () => {
        const { waitForNextUpdate, result } = renderHook<
          string,
          { indexFieldsSearch: IndexFieldSearch }
        >(() => useDataView(), {
          wrapper: TestProviders,
        });
        await waitForNextUpdate();
        indexFieldsSearch = result.current.indexFieldsSearch;
      });

      await indexFieldsSearch!({ dataViewId: 'neato' });
      const {
        payload: { browserFields, indexFields, docValueFields },
      } = mockDispatch.mock.calls[1][0];

      mockDispatch.mockClear();

      await indexFieldsSearch!({ dataViewId: 'neato', cleanCache: true });
      const {
        payload: {
          browserFields: newBrowserFields,
          indexFields: newIndexFields,
          docValueFields: newDocValueFields,
        },
      } = mockDispatch.mock.calls[1][0];

      expect(browserFields).not.toBe(newBrowserFields);
      expect(indexFields).not.toBe(newIndexFields);
      expect(docValueFields).not.toBe(newDocValueFields);
    });
  });
});
