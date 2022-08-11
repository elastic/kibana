/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockHttpValues,
  mockFlashMessageHelpers,
} from '../../../__mocks__/kea_logic';
import '../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';

import { SYNONYMS_PAGE_META } from './constants';

import { SynonymsLogic } from '.';

describe('SynonymsLogic', () => {
  const { mount } = new LogicMounter(SynonymsLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors, flashSuccessToast, clearFlashMessages } = mockFlashMessageHelpers;

  const MOCK_SYNONYM_SET = {
    id: 'some-synonym-id',
    synonyms: ['hello', 'world'],
  };
  const MOCK_SYNONYMS_RESPONSE = {
    meta: {
      page: {
        current: 1,
        size: 12,
        total_results: 1,
        total_pages: 1,
      },
    },
    results: [MOCK_SYNONYM_SET],
  };

  const DEFAULT_VALUES = {
    dataLoading: true,
    synonymSets: [],
    meta: SYNONYMS_PAGE_META,
    isModalOpen: false,
    activeSynonymSet: null,
    modalLoading: false,
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

    describe('openModal', () => {
      it('should set isModalOpen to true and populate an activeSynonymSet', () => {
        mount({ isModalOpen: false, activeSynonymSet: null });

        SynonymsLogic.actions.openModal(MOCK_SYNONYM_SET);

        expect(SynonymsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isModalOpen: true,
          activeSynonymSet: MOCK_SYNONYM_SET,
        });
      });

      describe('closeModal', () => {
        it('should set isModalOpen & modalLoading to false and reset activeSynonymSet', () => {
          mount({ isModalOpen: true, modalLoading: true, activeSynonymSet: MOCK_SYNONYM_SET });

          SynonymsLogic.actions.closeModal();

          expect(SynonymsLogic.values).toEqual({
            ...DEFAULT_VALUES,
            isModalOpen: false,
            modalLoading: false,
            activeSynonymSet: null,
          });
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

        expect(http.get).toHaveBeenCalledWith('/internal/app_search/engines/some-engine/synonyms', {
          query: {
            'page[current]': 1,
            'page[size]': 12,
          },
        });
        expect(SynonymsLogic.actions.onSynonymsLoad).toHaveBeenCalledWith(MOCK_SYNONYMS_RESPONSE);
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        SynonymsLogic.actions.loadSynonyms();
      });
    });

    describe('createSynonymSet', () => {
      it('should set modalLoading state and clear flash messages', () => {
        mount({ modalLoading: false });

        SynonymsLogic.actions.createSynonymSet(['test']);

        expect(SynonymsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          modalLoading: true,
        });
        expect(clearFlashMessages).toHaveBeenCalled();
      });

      it('should make a POST API call', async () => {
        http.post.mockReturnValueOnce(Promise.resolve());
        mount();
        jest.spyOn(SynonymsLogic.actions, 'onSynonymSetSuccess');

        SynonymsLogic.actions.createSynonymSet(['a', 'b', 'c']);
        await nextTick();

        expect(http.post).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/synonyms',
          {
            body: '{"synonyms":["a","b","c"]}',
          }
        );
        expect(SynonymsLogic.actions.onSynonymSetSuccess).toHaveBeenCalledWith(
          'Synonym set created'
        );
      });

      it('handles errors', async () => {
        http.post.mockReturnValueOnce(Promise.reject('error'));
        mount();
        jest.spyOn(SynonymsLogic.actions, 'onSynonymSetError');

        SynonymsLogic.actions.createSynonymSet([]);
        await nextTick();

        expect(SynonymsLogic.actions.onSynonymSetError).toHaveBeenCalled();
        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });

    describe('updateSynonymSet', () => {
      it('should set modalLoading state and clear flash messages', () => {
        mount({ modalLoading: false });

        SynonymsLogic.actions.updateSynonymSet(MOCK_SYNONYM_SET);

        expect(SynonymsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          modalLoading: true,
        });
        expect(clearFlashMessages).toHaveBeenCalled();
      });

      it('should make a PUT API call', async () => {
        http.put.mockReturnValueOnce(Promise.resolve());
        mount();
        jest.spyOn(SynonymsLogic.actions, 'onSynonymSetSuccess');

        SynonymsLogic.actions.updateSynonymSet(MOCK_SYNONYM_SET);
        await nextTick();

        expect(http.put).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/synonyms/some-synonym-id',
          {
            body: '{"synonyms":["hello","world"]}',
          }
        );
        expect(SynonymsLogic.actions.onSynonymSetSuccess).toHaveBeenCalledWith(
          'Synonym set updated'
        );
      });

      it('handles errors', async () => {
        http.put.mockReturnValueOnce(Promise.reject('error'));
        mount();
        jest.spyOn(SynonymsLogic.actions, 'onSynonymSetError');

        SynonymsLogic.actions.updateSynonymSet(MOCK_SYNONYM_SET);
        await nextTick();

        expect(SynonymsLogic.actions.onSynonymSetError).toHaveBeenCalled();
        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });

    describe('deleteSynonymSet', () => {
      it('should set modalLoading state and clear flash messages', () => {
        mount({ modalLoading: false });

        SynonymsLogic.actions.deleteSynonymSet('id');

        expect(SynonymsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          modalLoading: true,
        });
        expect(clearFlashMessages).toHaveBeenCalled();
      });

      it('should make a DELETE API call', async () => {
        http.delete.mockReturnValueOnce(Promise.resolve());
        mount();
        jest.spyOn(SynonymsLogic.actions, 'onSynonymSetSuccess');

        SynonymsLogic.actions.deleteSynonymSet('some-synonym-id');
        await nextTick();

        expect(http.delete).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/synonyms/some-synonym-id'
        );
        expect(SynonymsLogic.actions.onSynonymSetSuccess).toHaveBeenCalledWith(
          'Synonym set deleted'
        );
      });

      it('handles errors', async () => {
        http.delete.mockReturnValueOnce(Promise.reject('error'));
        mount();
        jest.spyOn(SynonymsLogic.actions, 'onSynonymSetError');

        SynonymsLogic.actions.deleteSynonymSet('id');
        await nextTick();

        expect(SynonymsLogic.actions.onSynonymSetError).toHaveBeenCalled();
        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });

    describe('onSynonymSetSuccess', () => {
      it('should reload synonyms, close the modal, and flash a success toast', async () => {
        mount();
        jest.spyOn(SynonymsLogic.actions, 'loadSynonyms');
        jest.spyOn(SynonymsLogic.actions, 'closeModal');

        await SynonymsLogic.actions.onSynonymSetSuccess('Success!!');

        expect(SynonymsLogic.actions.loadSynonyms).toHaveBeenCalled();
        expect(SynonymsLogic.actions.closeModal).toHaveBeenCalled();
        expect(flashSuccessToast).toHaveBeenCalledWith('Success!!', {
          text: 'The set will impact your results shortly.',
        });
      });
    });

    describe('onSynonymSetError', () => {
      it('should set modalLoading to false', () => {
        mount({ modalLoading: true });

        SynonymsLogic.actions.onSynonymSetError();

        expect(SynonymsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          modalLoading: false,
        });
      });
    });
  });
});
