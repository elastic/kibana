/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../__mocks__/engine_logic.mock';
import {
  LogicMounter,
  mockHttpValues,
  mockFlashMessageHelpers,
} from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { SearchLogic } from './search_logic';

describe('SearchLogic', () => {
  const { mount } = new LogicMounter(SearchLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors } = mockFlashMessageHelpers;

  const MOCK_SEARCH_RESPONSE = {
    results: [
      { id: { raw: 'document-1' }, _meta: { id: 'document-1', engine: 'some-engine' } },
      { id: { raw: 'document-2' }, _meta: { id: 'document-2', engine: 'some-engine' } },
      { id: { raw: 'document-3' }, _meta: { id: 'document-3', engine: 'some-engine' } },
    ],
  };

  const DEFAULT_VALUES = {
    searchDataLoading: false,
    searchQuery: '',
    searchResults: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mountLogic = (values: object = {}) => mount(values, { id: '1' });

  it('has expected default values', () => {
    const logic = mountLogic();
    expect(logic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('search', () => {
      it('sets searchQuery & searchDataLoading to true', () => {
        const logic = mountLogic({ searchQuery: '', searchDataLoading: false });

        logic.actions.search('hello world');

        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          searchQuery: 'hello world',
          searchDataLoading: true,
        });
      });
    });

    describe('onSearch', () => {
      it('sets searchResults & searchDataLoading to false', () => {
        const logic = mountLogic({ searchResults: [], searchDataLoading: true });

        logic.actions.onSearch(MOCK_SEARCH_RESPONSE);

        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          searchResults: MOCK_SEARCH_RESPONSE.results,
          searchDataLoading: false,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('search', () => {
      beforeAll(() => jest.useFakeTimers());
      afterAll(() => jest.useRealTimers());

      it('should make a GET API call with a search query', async () => {
        http.post.mockReturnValueOnce(Promise.resolve(MOCK_SEARCH_RESPONSE));
        const logic = mountLogic();
        jest.spyOn(logic.actions, 'onSearch');

        logic.actions.search('hello world');
        jest.runAllTimers();
        await nextTick();

        expect(http.post).toHaveBeenCalledWith('/internal/app_search/engines/some-engine/search', {
          query: { query: 'hello world' },
        });
        expect(logic.actions.onSearch).toHaveBeenCalledWith(MOCK_SEARCH_RESPONSE);
      });

      it('handles errors', async () => {
        http.post.mockReturnValueOnce(Promise.reject('error'));
        const logic = mountLogic();

        logic.actions.search('test');
        jest.runAllTimers();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });
});
