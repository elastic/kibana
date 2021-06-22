/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockHttpValues,
  mockKibanaValues,
  mockFlashMessageHelpers,
} from '../../../../__mocks__/kea_logic';
import '../../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test/jest';

import { CurationLogic } from './';

describe('CurationLogic', () => {
  const { mount } = new LogicMounter(CurationLogic);
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  const { clearFlashMessages, flashAPIErrors } = mockFlashMessageHelpers;

  const MOCK_CURATION_RESPONSE = {
    id: 'cur-123456789',
    last_updated: 'some timestamp',
    queries: ['some search'],
    promoted: [{ id: 'some-promoted-document' }],
    organic: [
      {
        id: { raw: 'some-organic-document', snippet: null },
        _meta: { id: 'some-organic-document', engine: 'some-engine' },
      },
    ],
    hidden: [{ id: 'some-hidden-document' }],
  };

  const DEFAULT_VALUES = {
    dataLoading: true,
    curation: {
      id: '',
      last_updated: '',
      queries: [],
      promoted: [],
      organic: [],
      hidden: [],
    },
    queries: [],
    queriesLoading: false,
    activeQuery: '',
    organicDocumentsLoading: false,
    promotedIds: [],
    promotedDocumentsLoading: false,
    hiddenIds: [],
    hiddenDocumentsLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(CurationLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onCurationLoad', () => {
      it('should set curation, queries, activeQuery, promotedIds, hiddenIds, & all loading states to false', () => {
        mount();

        CurationLogic.actions.onCurationLoad(MOCK_CURATION_RESPONSE);

        expect(CurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          curation: MOCK_CURATION_RESPONSE,
          queries: ['some search'],
          activeQuery: 'some search',
          promotedIds: ['some-promoted-document'],
          hiddenIds: ['some-hidden-document'],
          dataLoading: false,
          queriesLoading: false,
          organicDocumentsLoading: false,
          promotedDocumentsLoading: false,
          hiddenDocumentsLoading: false,
        });
      });

      it("should not override activeQuery once it's been set", () => {
        mount({ activeQuery: 'test' });

        CurationLogic.actions.onCurationLoad(MOCK_CURATION_RESPONSE);

        expect(CurationLogic.values.activeQuery).toEqual('test');
      });
    });

    describe('onCurationError', () => {
      it('should set all loading states to false', () => {
        mount({
          dataLoading: true,
          queriesLoading: true,
          organicDocumentsLoading: true,
          promotedDocumentsLoading: true,
          hiddenDocumentsLoading: true,
        });

        CurationLogic.actions.onCurationError();

        expect(CurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: false,
          queriesLoading: false,
          organicDocumentsLoading: false,
          promotedDocumentsLoading: false,
          hiddenDocumentsLoading: false,
        });
      });
    });

    describe('updateQueries', () => {
      it('should set queries state & queriesLoading to true', () => {
        const values = { ...DEFAULT_VALUES, queries: ['a', 'b'], activeQuery: 'a' };
        mount(values);

        CurationLogic.actions.updateQueries(['a', 'b', 'c']);

        expect(CurationLogic.values).toEqual({
          ...values,
          queries: ['a', 'b', 'c'],
          queriesLoading: true,
        });
      });
    });

    describe('setActiveQuery', () => {
      it('should set activeQuery state & organicDocumentsLoading to true', () => {
        mount();

        CurationLogic.actions.setActiveQuery('some query');

        expect(CurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          activeQuery: 'some query',
          organicDocumentsLoading: true,
        });
      });
    });

    describe('setPromotedIds', () => {
      it('should set promotedIds state & promotedDocumentsLoading to true', () => {
        mount();

        CurationLogic.actions.setPromotedIds(['hello', 'world']);

        expect(CurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          promotedIds: ['hello', 'world'],
          promotedDocumentsLoading: true,
        });
      });
    });

    describe('addPromotedId', () => {
      it('should set promotedIds state & promotedDocumentsLoading to true', () => {
        mount({ promotedIds: ['hello'] });

        CurationLogic.actions.addPromotedId('world');

        expect(CurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          promotedIds: ['hello', 'world'],
          promotedDocumentsLoading: true,
        });
      });
    });

    describe('removePromotedId', () => {
      it('should set promotedIds state & promotedDocumentsLoading to true', () => {
        mount({ promotedIds: ['hello', 'deleteme', 'world'] });

        CurationLogic.actions.removePromotedId('deleteme');

        expect(CurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          promotedIds: ['hello', 'world'],
          promotedDocumentsLoading: true,
        });
      });
    });

    describe('clearPromotedId', () => {
      it('should reset promotedIds state & set promotedDocumentsLoading to true', () => {
        mount({ promotedIds: ['hello', 'world'] });

        CurationLogic.actions.clearPromotedIds();

        expect(CurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          promotedIds: [],
          promotedDocumentsLoading: true,
        });
      });
    });

    describe('addHiddenId', () => {
      it('should set hiddenIds state & hiddenDocumentsLoading to true', () => {
        mount({ hiddenIds: ['hello'] });

        CurationLogic.actions.addHiddenId('world');

        expect(CurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          hiddenIds: ['hello', 'world'],
          hiddenDocumentsLoading: true,
        });
      });
    });

    describe('removeHiddenId', () => {
      it('should set hiddenIds state & hiddenDocumentsLoading to true', () => {
        mount({ hiddenIds: ['hello', 'deleteme', 'world'] });

        CurationLogic.actions.removeHiddenId('deleteme');

        expect(CurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          hiddenIds: ['hello', 'world'],
          hiddenDocumentsLoading: true,
        });
      });
    });

    describe('clearHiddenId', () => {
      it('should reset hiddenIds state & set hiddenDocumentsLoading to true', () => {
        mount({ hiddenIds: ['hello', 'world'] });

        CurationLogic.actions.clearHiddenIds();

        expect(CurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          hiddenIds: [],
          hiddenDocumentsLoading: true,
        });
      });
    });

    describe('resetCuration', () => {
      it('should clear promotedIds & hiddenIds & set dataLoading to true', () => {
        mount({ promotedIds: ['hello'], hiddenIds: ['world'] });

        CurationLogic.actions.resetCuration();

        expect(CurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: true,
          promotedIds: [],
          promotedDocumentsLoading: true,
          hiddenIds: [],
          hiddenDocumentsLoading: true,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('loadCuration', () => {
      it('should set dataLoading state', () => {
        mount({ dataLoading: false }, { curationId: 'cur-123456789' });

        CurationLogic.actions.loadCuration();

        expect(CurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: true,
        });
      });

      it('should make an API call and set curation state', async () => {
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_CURATION_RESPONSE));
        mount({}, { curationId: 'cur-123456789' });
        jest.spyOn(CurationLogic.actions, 'onCurationLoad');

        CurationLogic.actions.loadCuration();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/api/app_search/engines/some-engine/curations/cur-123456789'
        );
        expect(CurationLogic.actions.onCurationLoad).toHaveBeenCalledWith(MOCK_CURATION_RESPONSE);
      });

      it('handles errors/404s with a redirect to the Curations view', async () => {
        http.get.mockReturnValueOnce(Promise.reject('error'));
        mount({}, { curationId: 'cur-404' });

        CurationLogic.actions.loadCuration();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error', { isQueued: true });
        expect(navigateToUrl).toHaveBeenCalledWith('/engines/some-engine/curations');
      });
    });

    describe('updateCuration', () => {
      beforeAll(() => jest.useFakeTimers());
      afterAll(() => jest.useRealTimers());

      it('should make a PUT API call with queries and promoted/hidden IDs to update', async () => {
        http.put.mockReturnValueOnce(Promise.resolve(MOCK_CURATION_RESPONSE));
        mount(
          {
            queries: ['a', 'b', 'c'],
            activeQuery: 'b',
            promotedIds: ['d', 'e', 'f'],
            hiddenIds: ['g'],
          },
          { curationId: 'cur-123456789' }
        );
        jest.spyOn(CurationLogic.actions, 'onCurationLoad');

        CurationLogic.actions.updateCuration();
        jest.runAllTimers();
        await nextTick();

        expect(http.put).toHaveBeenCalledWith(
          '/api/app_search/engines/some-engine/curations/cur-123456789',
          {
            body: '{"queries":["a","b","c"],"query":"b","promoted":["d","e","f"],"hidden":["g"]}', // Uses state currently in CurationLogic
          }
        );
        expect(CurationLogic.actions.onCurationLoad).toHaveBeenCalledWith(MOCK_CURATION_RESPONSE);
      });

      it('handles errors', async () => {
        http.put.mockReturnValueOnce(Promise.reject('error'));
        mount({}, { curationId: 'cur-123456789' });
        jest.spyOn(CurationLogic.actions, 'onCurationError');

        CurationLogic.actions.updateCuration();
        jest.runAllTimers();
        await nextTick();

        expect(clearFlashMessages).toHaveBeenCalled();
        expect(flashAPIErrors).toHaveBeenCalledWith('error');
        expect(CurationLogic.actions.onCurationError).toHaveBeenCalled();
      });
    });

    describe('listeners that call updateCuration as a side effect', () => {
      beforeAll(() => {
        mount();
        jest.spyOn(CurationLogic.actions, 'updateCuration').mockImplementation(() => {});
      });

      afterAll(() => {
        (CurationLogic.actions.updateCuration as jest.Mock).mockRestore();
      });

      afterEach(() => {
        expect(CurationLogic.actions.updateCuration).toHaveBeenCalled();
      });

      describe('updateQueries', () => {
        it('calls updateCuration', () => {
          CurationLogic.actions.updateQueries(['hello', 'world']);
        });

        it('should also call setActiveQuery if the current activeQuery was deleted from queries', () => {
          jest.spyOn(CurationLogic.actions, 'setActiveQuery');
          CurationLogic.actions.updateQueries(['world']);
          expect(CurationLogic.actions.setActiveQuery).toHaveBeenCalledWith('world');
        });
      });

      it('setActiveQuery', () => {
        CurationLogic.actions.setActiveQuery('test');
      });

      it('setPromotedIds', () => {
        CurationLogic.actions.setPromotedIds(['test']);
      });

      it('addPromotedId', () => {
        CurationLogic.actions.addPromotedId('test');
      });

      it('removePromotedId', () => {
        CurationLogic.actions.removePromotedId('test');
      });

      it('clearPromotedIds', () => {
        CurationLogic.actions.clearPromotedIds();
      });

      it('addHiddenId', () => {
        CurationLogic.actions.addHiddenId('test');
      });

      it('removeHiddenId', () => {
        CurationLogic.actions.removeHiddenId('test');
      });

      it('clearHiddenIds', () => {
        CurationLogic.actions.clearHiddenIds();
      });
    });
  });
});
