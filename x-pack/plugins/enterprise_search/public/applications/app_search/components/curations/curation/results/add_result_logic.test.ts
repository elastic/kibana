/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockHttpValues, mockFlashMessageHelpers } from '../../../../../__mocks__';
import '../../../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test/jest';

import { AddResultLogic } from './';

describe('AddResultLogic', () => {
  const { mount } = new LogicMounter(AddResultLogic);
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
    isFlyoutOpen: false,
    dataLoading: false,
    searchQuery: '',
    searchResults: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(AddResultLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('openFlyout', () => {
      it('sets isFlyoutOpen to true and resets the searchQuery term', () => {
        mount({ isFlyoutOpen: false, searchQuery: 'a previous search' });

        AddResultLogic.actions.openFlyout();

        expect(AddResultLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isFlyoutOpen: true,
          searchQuery: '',
        });
      });
    });

    describe('closeFlyout', () => {
      it('sets isFlyoutOpen to false', () => {
        mount({ isFlyoutOpen: true });

        AddResultLogic.actions.closeFlyout();

        expect(AddResultLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isFlyoutOpen: false,
        });
      });
    });

    describe('search', () => {
      it('sets searchQuery & dataLoading to true', () => {
        mount({ searchQuery: '', dataLoading: false });

        AddResultLogic.actions.search('hello world');

        expect(AddResultLogic.values).toEqual({
          ...DEFAULT_VALUES,
          searchQuery: 'hello world',
          dataLoading: true,
        });
      });
    });

    describe('onSearch', () => {
      it('sets searchResults & dataLoading to false', () => {
        mount({ searchResults: [], dataLoading: true });

        AddResultLogic.actions.onSearch(MOCK_SEARCH_RESPONSE);

        expect(AddResultLogic.values).toEqual({
          ...DEFAULT_VALUES,
          searchResults: MOCK_SEARCH_RESPONSE.results,
          dataLoading: false,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('search', () => {
      beforeAll(() => jest.useFakeTimers());
      afterAll(() => jest.useRealTimers());

      it('should make a GET API call with a search query', async () => {
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_SEARCH_RESPONSE));
        mount();
        jest.spyOn(AddResultLogic.actions, 'onSearch');

        AddResultLogic.actions.search('hello world');
        jest.runAllTimers();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/api/app_search/engines/some-engine/curation_search',
          { query: { query: 'hello world' } }
        );
        expect(AddResultLogic.actions.onSearch).toHaveBeenCalledWith(MOCK_SEARCH_RESPONSE);
      });

      it('handles errors', async () => {
        http.get.mockReturnValueOnce(Promise.reject('error'));
        mount();

        AddResultLogic.actions.search('test');
        jest.runAllTimers();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });
});
