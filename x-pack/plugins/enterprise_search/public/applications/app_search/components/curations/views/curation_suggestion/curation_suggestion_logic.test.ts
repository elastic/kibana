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
  mockKibanaValues,
} from '../../../../../__mocks__/kea_logic';

import '../../../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { itShowsServerErrorAsFlashMessage } from '../../../../../test_helpers';
import { HydratedCurationSuggestion } from '../../types';

import { CurationSuggestionLogic } from './curation_suggestion_logic';

const DEFAULT_VALUES = {
  dataLoading: true,
  suggestion: null,
};

const suggestion: HydratedCurationSuggestion = {
  query: 'foo',
  updated_at: '2021-07-08T14:35:50Z',
  promoted: [
    {
      id: '1',
    },
    {
      id: '2',
    },
    {
      id: '3',
    },
  ],
  status: 'pending',
  operation: 'create',
  curation: {
    id: 'cur-6155e69c7a2f2e4f756303fd',
    queries: ['foo'],
    promoted: [
      {
        id: '5',
      },
    ],
    hidden: [],
    last_updated: 'September 30, 2021 at 04:32PM',
    organic: [
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
  },
  organic: [
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
};

const MOCK_RESPONSE = {
  query: 'foo',
  status: 'pending',
  updated_at: '2021-07-08T14:35:50Z',
  operation: 'create',
  suggestion: {
    promoted: [
      {
        id: '1',
      },
      {
        id: '2',
      },
      {
        id: '3',
      },
    ],
    organic: [
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
  },
  curation: {
    id: 'cur-6155e69c7a2f2e4f756303fd',
    queries: ['foo'],
    promoted: [
      {
        id: '5',
      },
    ],
    hidden: [],
    last_updated: 'September 30, 2021 at 04:32PM',
    organic: [
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
  },
};

describe('CurationSuggestionLogic', () => {
  const { mount } = new LogicMounter(CurationSuggestionLogic);
  const { setErrorMessage, setQueuedErrorMessage } = mockFlashMessageHelpers;
  const { navigateToUrl } = mockKibanaValues;

  const mountLogic = (props: object = {}) => {
    mount(props, { query: 'foo-query' });
  };

  const { http } = mockHttpValues;

  const itHandlesInlineErrors = (callback: () => void) => {
    it('handles inline errors', async () => {
      http.put.mockReturnValueOnce(
        Promise.resolve({
          results: [
            {
              error: 'error',
            },
          ],
        })
      );
      mountLogic({
        suggestion,
      });

      callback();
      await nextTick();

      expect(setErrorMessage).toHaveBeenCalledWith('error');
    });
  };

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
        });
        expect(CurationSuggestionLogic.values).toEqual({
          ...DEFAULT_VALUES,
          suggestion,
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
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_RESPONSE));
        mountLogic();
        jest.spyOn(CurationSuggestionLogic.actions, 'onSuggestionLoaded');

        CurationSuggestionLogic.actions.loadSuggestion();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/adaptive_relevance/suggestions/foo-query',
          {
            query: {
              type: 'curation',
            },
          }
        );

        expect(CurationSuggestionLogic.actions.onSuggestionLoaded).toHaveBeenCalledWith({
          suggestion,
        });
      });

      // This could happen if a user applies a suggestion and then navigates back to a detail page via
      // the back button, etc. The suggestion still exists, it's just not in a "pending" state
      // so we can show it.ga
      it('will redirect if the suggestion is not found', async () => {
        http.get.mockReturnValueOnce(
          Promise.reject({
            response: { status: 404 },
          })
        );

        mountLogic();
        CurationSuggestionLogic.actions.loadSuggestion();
        await nextTick();
        expect(setQueuedErrorMessage).toHaveBeenCalled();
        expect(navigateToUrl).toHaveBeenCalledWith('/engines/some-engine/curations');
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        CurationSuggestionLogic.actions.loadSuggestion();
      });
    });

    describe('acceptSuggestion', () => {
      it('will make an http call to apply the suggestion, and then navigate to that detail page', async () => {
        http.put.mockReturnValueOnce(
          Promise.resolve({
            results: [
              {
                ...suggestion,
                status: 'accepted',
                curation_id: 'cur-6155e69c7a2f2e4f756303fd',
              },
            ],
          })
        );
        mountLogic({
          suggestion,
        });

        CurationSuggestionLogic.actions.acceptSuggestion();
        await nextTick();

        expect(http.put).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/adaptive_relevance/suggestions',
          {
            body: JSON.stringify([
              {
                query: 'foo',
                type: 'curation',
                status: 'applied',
              },
            ]),
          }
        );

        expect(navigateToUrl).toHaveBeenCalledWith(
          '/engines/some-engine/curations/cur-6155e69c7a2f2e4f756303fd'
        );
      });

      describe('when a suggestion is a "delete" suggestion', () => {
        const deleteSuggestion = {
          ...suggestion,
          operation: 'delete',
          promoted: [],
          curation_id: 'cur-6155e69c7a2f2e4f756303fd',
        };

        it('will show a confirm message before applying, and redirect a user back to the curations page, rather than the curation details page', async () => {
          jest.spyOn(global, 'confirm').mockReturnValueOnce(true);
          http.put.mockReturnValueOnce(
            Promise.resolve({
              results: [{ ...suggestion, status: 'accepted', curation_id: undefined }],
            })
          );
          mountLogic({
            suggestion: deleteSuggestion,
          });
          CurationSuggestionLogic.actions.acceptSuggestion();
          await nextTick();

          expect(navigateToUrl).toHaveBeenCalledWith('/engines/some-engine/curations');
        });

        it('will do nothing if the user does not confirm', async () => {
          jest.spyOn(global, 'confirm').mockReturnValueOnce(false);
          mountLogic({
            suggestion: deleteSuggestion,
          });
          CurationSuggestionLogic.actions.acceptSuggestion();
          await nextTick();
          expect(http.put).not.toHaveBeenCalled();
          expect(navigateToUrl).not.toHaveBeenCalled();
        });
      });

      itShowsServerErrorAsFlashMessage(http.put, () => {
        jest.spyOn(global, 'confirm').mockReturnValueOnce(true);
        CurationSuggestionLogic.actions.acceptSuggestion();
      });

      itHandlesInlineErrors(() => {
        CurationSuggestionLogic.actions.acceptSuggestion();
      });
    });

    describe('acceptAndAutomateSuggestion', () => {
      it('will make an http call to apply the suggestion, and then navigate to that detail page', async () => {
        http.put.mockReturnValueOnce(
          Promise.resolve({
            results: [
              {
                ...suggestion,
                status: 'accepted',
                curation_id: 'cur-6155e69c7a2f2e4f756303fd',
              },
            ],
          })
        );
        mountLogic({
          suggestion,
        });

        CurationSuggestionLogic.actions.acceptAndAutomateSuggestion();
        await nextTick();

        expect(http.put).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/adaptive_relevance/suggestions',
          {
            body: JSON.stringify([
              {
                query: 'foo',
                type: 'curation',
                status: 'automated',
              },
            ]),
          }
        );

        expect(navigateToUrl).toHaveBeenCalledWith(
          '/engines/some-engine/curations/cur-6155e69c7a2f2e4f756303fd'
        );
      });

      describe('when a suggestion is a "delete" suggestion', () => {
        const deleteSuggestion = {
          ...suggestion,
          operation: 'delete',
          promoted: [],
          curation_id: 'cur-6155e69c7a2f2e4f756303fd',
        };

        it('will show a confirm message before applying, and redirect a user back to the curations page, rather than the curation details page', async () => {
          jest.spyOn(global, 'confirm').mockReturnValueOnce(true);
          http.put.mockReturnValueOnce(
            Promise.resolve({
              results: [{ ...suggestion, status: 'accepted', curation_id: undefined }],
            })
          );
          mountLogic({
            suggestion: deleteSuggestion,
          });
          CurationSuggestionLogic.actions.acceptAndAutomateSuggestion();
          await nextTick();

          expect(navigateToUrl).toHaveBeenCalledWith('/engines/some-engine/curations');
        });

        it('will do nothing if the user does not confirm', async () => {
          jest.spyOn(global, 'confirm').mockReturnValueOnce(false);
          mountLogic({
            suggestion: deleteSuggestion,
          });
          CurationSuggestionLogic.actions.acceptAndAutomateSuggestion();
          await nextTick();
          expect(http.put).not.toHaveBeenCalled();
          expect(navigateToUrl).not.toHaveBeenCalled();
        });
      });

      itShowsServerErrorAsFlashMessage(http.put, () => {
        jest.spyOn(global, 'confirm').mockReturnValueOnce(true);
        CurationSuggestionLogic.actions.acceptAndAutomateSuggestion();
      });

      itHandlesInlineErrors(() => {
        CurationSuggestionLogic.actions.acceptAndAutomateSuggestion();
      });
    });

    describe('rejectSuggestion', () => {
      it('will make an http call to apply the suggestion, and then navigate back the curations page', async () => {
        http.put.mockReturnValueOnce(
          Promise.resolve({
            results: [
              {
                ...suggestion,
                status: 'rejected',
                curation_id: 'cur-6155e69c7a2f2e4f756303fd',
              },
            ],
          })
        );
        mountLogic({
          suggestion,
        });

        CurationSuggestionLogic.actions.rejectSuggestion();
        await nextTick();

        expect(http.put).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/adaptive_relevance/suggestions',
          {
            body: JSON.stringify([
              {
                query: 'foo',
                type: 'curation',
                status: 'rejected',
              },
            ]),
          }
        );

        expect(navigateToUrl).toHaveBeenCalledWith('/engines/some-engine/curations');
      });

      itShowsServerErrorAsFlashMessage(http.put, () => {
        CurationSuggestionLogic.actions.rejectSuggestion();
      });

      itHandlesInlineErrors(() => {
        CurationSuggestionLogic.actions.rejectSuggestion();
      });
    });

    describe('rejectAndDisableSuggestion', () => {
      it('will make an http call to apply the suggestion, and then navigate back the curations page', async () => {
        http.put.mockReturnValueOnce(
          Promise.resolve({
            results: [
              {
                ...suggestion,
                status: 'disabled',
                curation_id: 'cur-6155e69c7a2f2e4f756303fd',
              },
            ],
          })
        );
        mountLogic({
          suggestion,
        });

        CurationSuggestionLogic.actions.rejectAndDisableSuggestion();
        await nextTick();

        expect(http.put).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/adaptive_relevance/suggestions',
          {
            body: JSON.stringify([
              {
                query: 'foo',
                type: 'curation',
                status: 'disabled',
              },
            ]),
          }
        );

        expect(navigateToUrl).toHaveBeenCalledWith('/engines/some-engine/curations');
      });

      itShowsServerErrorAsFlashMessage(http.put, () => {
        CurationSuggestionLogic.actions.rejectAndDisableSuggestion();
      });

      itHandlesInlineErrors(() => {
        CurationSuggestionLogic.actions.rejectAndDisableSuggestion();
      });
    });
  });
});
