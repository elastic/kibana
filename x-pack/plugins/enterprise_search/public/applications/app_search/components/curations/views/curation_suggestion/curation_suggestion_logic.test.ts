/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
} from '../../../../../__mocks__/kea_logic';

import { set } from 'lodash/fp';

import '../../../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test/jest';

import { CurationSuggestion } from '../../types';

import { CurationSuggestionLogic } from './curation_suggestion_logic';

const DEFAULT_VALUES = {
  dataLoading: true,
  suggestion: null,
  suggestedPromotedDocuments: [],
  curation: null,
};

const suggestion: CurationSuggestion = {
  query: 'foo',
  updated_at: '2021-07-08T14:35:50Z',
  promoted: ['1', '2', '3'],
  status: 'applied',
};

const curation = {
  id: 'cur-6155e69c7a2f2e4f756303fd',
  queries: ['foo'],
  promoted: [
    {
      id: '5',
    },
  ],
  hidden: [],
  last_updated: 'September 30, 2021 at 04:32PM',
  organic: [],
};

const suggestedPromotedDocuments = [
  {
    id: {
      raw: '1',
    },
    _meta: {
      id: '1',
      engine: 'some-engine',
    },
  },
  {
    id: {
      raw: '2',
    },
    _meta: {
      id: '2',
      engine: 'some-engine',
    },
  },
  {
    id: {
      raw: '3',
    },
    _meta: {
      id: '3',
      engine: 'some-engine',
    },
  },
];

const MOCK_RESPONSE = {
  meta: {
    page: {
      current: 1,
      size: 10,
      total_results: 1,
      total_pages: 1,
    },
  },
  results: [suggestion],
};

const MOCK_DOCUMENTS_RESPONSE = {
  results: [
    {
      id: {
        raw: '2',
      },
      _meta: {
        id: '2',
        engine: 'some-engine',
      },
    },
    {
      id: {
        raw: '1',
      },
      _meta: {
        id: '1',
        engine: 'some-engine',
      },
    },
  ],
};

describe('CurationSuggestionLogic', () => {
  const { mount } = new LogicMounter(CurationSuggestionLogic);
  const { flashAPIErrors } = mockFlashMessageHelpers;
  const mountLogic = (props: object = {}) => {
    mount(props, { query: 'foo-query' });
  };

  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mountLogic();
    expect(CurationSuggestionLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onSuggestionLoaded', () => {
      it('should save provided state and set dataLoading to false', () => {
        mountLogic();
        CurationSuggestionLogic.actions.onSuggestionLoaded({
          suggestion,
          suggestedPromotedDocuments,
          curation,
        });
        expect(CurationSuggestionLogic.values).toEqual({
          ...DEFAULT_VALUES,
          suggestion,
          suggestedPromotedDocuments,
          curation,
          dataLoading: false,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('loadSuggestion', () => {
      it('should set dataLoading state', () => {
        mountLogic({ dataLoading: false });

        CurationSuggestionLogic.actions.loadSuggestion();

        expect(CurationSuggestionLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: true,
        });
      });

      it('should make API calls to fetch data and trigger onSuggestionLoaded', async () => {
        http.post.mockReturnValueOnce(Promise.resolve(MOCK_RESPONSE));
        http.post.mockReturnValueOnce(Promise.resolve(MOCK_DOCUMENTS_RESPONSE));
        mountLogic();
        jest.spyOn(CurationSuggestionLogic.actions, 'onSuggestionLoaded');

        CurationSuggestionLogic.actions.loadSuggestion();
        await nextTick();

        expect(http.post).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/search_relevance_suggestions/foo-query',
          {
            body: JSON.stringify({
              page: {
                current: 1,
                size: 1,
              },
              filters: {
                status: ['pending'],
                type: 'curation',
              },
            }),
          }
        );

        expect(http.post).toHaveBeenCalledWith('/internal/app_search/engines/some-engine/search', {
          query: { query: '' },
          body: JSON.stringify({
            page: {
              size: 100,
            },
            filters: {
              // The results of the first API call are used to make the second http call for document details
              id: MOCK_RESPONSE.results[0].promoted,
            },
          }),
        });

        expect(CurationSuggestionLogic.actions.onSuggestionLoaded).toHaveBeenCalledWith({
          suggestion: {
            query: 'foo',
            updated_at: '2021-07-08T14:35:50Z',
            promoted: ['1', '2', '3'],
            status: 'applied',
          },
          // Note that these were re-ordered to match the 'promoted' list above, and since document
          // 3 was not found it is not included in this list
          suggestedPromotedDocuments: [
            {
              id: {
                raw: '1',
              },
              _meta: {
                id: '1',
                engine: 'some-engine',
              },
            },
            {
              id: {
                raw: '2',
              },
              _meta: {
                id: '2',
                engine: 'some-engine',
              },
            },
          ],
          curation: null,
        });
      });

      it('will also fetch curation details if the suggestion has a curation_id', async () => {
        http.post.mockReturnValueOnce(
          Promise.resolve(
            set('results[0].curation_id', 'cur-6155e69c7a2f2e4f756303fd', MOCK_RESPONSE)
          )
        );
        http.post.mockReturnValueOnce(Promise.resolve(MOCK_DOCUMENTS_RESPONSE));
        http.get.mockReturnValueOnce(Promise.resolve(curation));
        mountLogic({
          suggestion: set('curation_id', 'cur-6155e69c7a2f2e4f756303fd', suggestion),
        });
        jest.spyOn(CurationSuggestionLogic.actions, 'onSuggestionLoaded');

        CurationSuggestionLogic.actions.loadSuggestion();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/curations/cur-6155e69c7a2f2e4f756303fd',
          { query: { skip_record_analytics: 'true' } }
        );
        await nextTick();

        expect(CurationSuggestionLogic.actions.onSuggestionLoaded).toHaveBeenCalledWith({
          suggestion: expect.any(Object),
          suggestedPromotedDocuments: expect.any(Object),
          curation,
        });
      });

      it('handles errors', async () => {
        http.post.mockReturnValueOnce(Promise.reject('error'));
        mount();

        CurationSuggestionLogic.actions.loadSuggestion();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });
});
