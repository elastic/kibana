/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockHttpValues, mockFlashMessageHelpers } from '../../../__mocks__';
import '../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test/jest';

import { SYNONYMS_PAGE_META } from './constants';

import { SynonymsLogic } from './';

describe('SynonymsLogic', () => {
  const { mount } = new LogicMounter(SynonymsLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors } = mockFlashMessageHelpers;

  const MOCK_SYNONYMS_RESPONSE = {
    meta: {
      page: {
        current: 1,
        size: 12,
        total_results: 1,
        total_pages: 1,
      },
    },
    results: [
      {
        id: 'some-synonym-id',
        synonyms: ['hello', 'world'],
      },
    ],
  };

  const DEFAULT_VALUES = {
    dataLoading: true,
    synonymSets: [],
    meta: SYNONYMS_PAGE_META,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(SynonymsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onSynonymsLoad', () => {
      it('should set synonyms and meta state, & dataLoading to false', () => {
        mount();

        SynonymsLogic.actions.onSynonymsLoad(MOCK_SYNONYMS_RESPONSE);

        expect(SynonymsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          synonymSets: MOCK_SYNONYMS_RESPONSE.results,
          meta: MOCK_SYNONYMS_RESPONSE.meta,
          dataLoading: false,
        });
      });
    });

    describe('onPaginate', () => {
      it('should set meta.page.current state', () => {
        mount();

        SynonymsLogic.actions.onPaginate(3);

        expect(SynonymsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          meta: { page: { ...DEFAULT_VALUES.meta.page, current: 3 } },
        });
      });
    });
  });

  describe('listeners', () => {
    describe('loadSynonyms', () => {
      it('should set dataLoading state', () => {
        mount({ dataLoading: false });

        SynonymsLogic.actions.loadSynonyms();

        expect(SynonymsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: true,
        });
      });

      it('should make an API call and set synonyms & meta state', async () => {
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_SYNONYMS_RESPONSE));
        mount();
        jest.spyOn(SynonymsLogic.actions, 'onSynonymsLoad');

        SynonymsLogic.actions.loadSynonyms();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith('/api/app_search/engines/some-engine/synonyms', {
          query: {
            'page[current]': 1,
            'page[size]': 12,
          },
        });
        expect(SynonymsLogic.actions.onSynonymsLoad).toHaveBeenCalledWith(MOCK_SYNONYMS_RESPONSE);
      });

      it('handles errors', async () => {
        http.get.mockReturnValueOnce(Promise.reject('error'));
        mount();

        SynonymsLogic.actions.loadSynonyms();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });
});
