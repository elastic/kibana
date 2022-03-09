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

import { nextTick } from '@kbn/test-jest-helpers';

import { SchemaType } from '../../../shared/schema/types';
import { ApiTokenTypes } from '../credentials/constants';

import { EngineTypes } from './types';

import { EngineLogic } from './';

describe('EngineLogic', () => {
  const { mount, unmount } = new LogicMounter(EngineLogic);
  const { http } = mockHttpValues;
  const { flashErrorToast } = mockFlashMessageHelpers;

  const mockEngineData = {
    name: 'some-engine',
    type: EngineTypes.default,
    created_at: 'some date timestamp',
    language: null,
    document_count: 1,
    field_count: 1,
    result_fields: {
      id: { raw: {} },
    },
    unconfirmedFields: [],
    unsearchedUnconfirmedFields: false,
    sample: false,
    isMeta: false,
    invalidBoosts: false,
    schema: { test: SchemaType.Text },
    apiTokens: [],
    apiKey: 'some-key',
    adaptive_relevance_suggestions_active: true,
  };

  const DEFAULT_VALUES = {
    dataLoading: true,
    engine: {},
    engineName: '',
    hasNoDocuments: true,
    hasEmptySchema: true,
    isMetaEngine: false,
    isSampleEngine: false,
    hasSchemaErrors: false,
    hasSchemaConflicts: false,
    hasUnconfirmedSchemaFields: false,
    engineNotFound: false,
    searchKey: '',
    intervalId: null,
  };

  const DEFAULT_VALUES_WITH_ENGINE = {
    ...DEFAULT_VALUES,
    engine: mockEngineData,
    hasNoDocuments: false,
    hasEmptySchema: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(EngineLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setEngineData', () => {
      describe('engine & dataLoading', () => {
        it('should set engine to the provided value and dataLoading to false', () => {
          mount();
          EngineLogic.actions.setEngineData(mockEngineData);

          expect(EngineLogic.values).toEqual({
            ...DEFAULT_VALUES_WITH_ENGINE,
            engine: mockEngineData,
            dataLoading: false,
          });
        });
      });
    });

    describe('setEngineName', () => {
      describe('engineName', () => {
        it('should be set to the provided value', () => {
          mount();
          EngineLogic.actions.setEngineName('some-new-engine');

          expect(EngineLogic.values).toEqual({
            ...DEFAULT_VALUES,
            engineName: 'some-new-engine',
          });
        });
      });
    });

    describe('setEngineNotFound', () => {
      describe('engineNotFound', () => {
        it('should be set to the provided value', () => {
          mount();
          EngineLogic.actions.setEngineNotFound(true);

          expect(EngineLogic.values).toEqual({
            ...DEFAULT_VALUES,
            engineNotFound: true,
          });
        });
      });
    });

    describe('clearEngine', () => {
      describe('engine', () => {
        it('should be reset to an empty obj', () => {
          mount({ engine: mockEngineData });
          EngineLogic.actions.clearEngine();

          expect(EngineLogic.values).toEqual({
            ...DEFAULT_VALUES,
            engine: {},
          });
        });
      });

      describe('engineName', () => {
        it('should be reset to an empty string', () => {
          mount({ engineName: 'hello-world' });
          EngineLogic.actions.clearEngine();

          expect(EngineLogic.values).toEqual({
            ...DEFAULT_VALUES,
            engineName: '',
          });
        });
      });

      describe('dataLoading', () => {
        it('should be set to true', () => {
          mount({ dataLoading: false });
          EngineLogic.actions.clearEngine();

          expect(EngineLogic.values).toEqual({
            ...DEFAULT_VALUES,
            dataLoading: true,
          });
        });
      });

      describe('engineNotFound', () => {
        it('should be set to false', () => {
          mount({ engineNotFound: true });
          EngineLogic.actions.clearEngine();

          expect(EngineLogic.values).toEqual({
            ...DEFAULT_VALUES,
            engineNotFound: false,
          });
        });
      });
    });

    describe('onPollStart', () => {
      it('should set intervalId', () => {
        mount({ intervalId: null });
        EngineLogic.actions.onPollStart(123);

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES,
          intervalId: 123,
        });
      });

      describe('onPollStop', () => {
        // Note: This does have to be a separate action following stopPolling(), rather
        // than using stopPolling: () => null as a reducer. If you do that, then the ID
        // gets cleared before the actual poll interval does & the poll interval never clears :doh:

        it('should reset intervalId', () => {
          mount({ intervalId: 123 });
          EngineLogic.actions.onPollStop();

          expect(EngineLogic.values).toEqual({
            ...DEFAULT_VALUES,
            intervalId: null,
          });
        });
      });
    });
  });

  describe('listeners', () => {
    describe('initializeEngine', () => {
      it('fetches and sets engine data', async () => {
        mount({ engineName: 'some-engine' });
        jest.spyOn(EngineLogic.actions, 'setEngineData');
        http.get.mockReturnValueOnce(Promise.resolve(mockEngineData));

        EngineLogic.actions.initializeEngine();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith('/internal/app_search/engines/some-engine');
        expect(EngineLogic.actions.setEngineData).toHaveBeenCalledWith(mockEngineData);
      });

      it('handles 4xx errors', async () => {
        mount();
        jest.spyOn(EngineLogic.actions, 'setEngineNotFound');
        http.get.mockReturnValue(Promise.reject({ response: { status: 404 } }));

        EngineLogic.actions.initializeEngine();
        await nextTick();

        expect(EngineLogic.actions.setEngineNotFound).toHaveBeenCalledWith(true);
      });

      it('handles 5xx errors', async () => {
        mount();
        http.get.mockReturnValue(Promise.reject('An error occured'));

        EngineLogic.actions.initializeEngine();
        await nextTick();

        expect(flashErrorToast).toHaveBeenCalledWith('Could not fetch engine data', {
          text: expect.stringContaining('Please check your connection'),
          toastLifeTimeMs: 3750,
        });
      });
    });

    describe('pollEmptyEngine', () => {
      beforeEach(() => jest.useFakeTimers());
      afterEach(() => jest.clearAllTimers());
      afterAll(() => jest.useRealTimers());

      it('starts a poll', () => {
        mount();
        jest.spyOn(global, 'setInterval');
        jest.spyOn(EngineLogic.actions, 'onPollStart');

        EngineLogic.actions.pollEmptyEngine();

        expect(global.setInterval).toHaveBeenCalled();
        expect(EngineLogic.actions.onPollStart).toHaveBeenCalled();
      });

      it('polls for engine data if the current engine has no documents', () => {
        mount({ engine: { ...mockEngineData, document_count: 0 } });
        jest.spyOn(EngineLogic.actions, 'initializeEngine');

        EngineLogic.actions.pollEmptyEngine();

        jest.advanceTimersByTime(5000);
        expect(EngineLogic.actions.initializeEngine).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(5000);
        expect(EngineLogic.actions.initializeEngine).toHaveBeenCalledTimes(2);
      });

      it('cancels the poll if the current engine has documents', () => {
        mount({ engine: { ...mockEngineData, document_count: 1 } });
        jest.spyOn(EngineLogic.actions, 'stopPolling');
        jest.spyOn(EngineLogic.actions, 'initializeEngine');

        EngineLogic.actions.pollEmptyEngine();

        jest.advanceTimersByTime(5000);
        expect(EngineLogic.actions.stopPolling).toHaveBeenCalled();
        expect(EngineLogic.actions.initializeEngine).not.toHaveBeenCalled();
      });

      it('does not create new polls if one already exists', () => {
        jest.spyOn(global, 'setInterval');
        mount({ intervalId: 123 });

        EngineLogic.actions.pollEmptyEngine();

        expect(global.setInterval).not.toHaveBeenCalled();
      });
    });

    describe('stopPolling', () => {
      it('clears the poll interval and unsets the intervalId', () => {
        jest.spyOn(global, 'clearInterval');
        mount({ intervalId: 123 });

        EngineLogic.actions.stopPolling();

        expect(global.clearInterval).toHaveBeenCalledWith(123);
        expect(EngineLogic.values.intervalId).toEqual(null);
      });

      it('does not clearInterval if a poll has not been started', () => {
        jest.spyOn(global, 'clearInterval');
        mount({ intervalId: null });

        EngineLogic.actions.stopPolling();

        expect(global.clearInterval).not.toHaveBeenCalled();
      });
    });
  });

  describe('selectors', () => {
    describe('hasNoDocuments', () => {
      it('returns true if the engine contains no documents', () => {
        const engine = { ...mockEngineData, document_count: 0 };
        mount({ engine });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES_WITH_ENGINE,
          engine,
          hasNoDocuments: true,
        });
      });

      it('returns true if the engine is not yet initialized', () => {
        mount({ engine: {} });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES,
          hasNoDocuments: true,
        });
      });
    });

    describe('hasEmptySchema', () => {
      it('returns true if the engine schema contains no fields', () => {
        const engine = { ...mockEngineData, schema: {} };
        mount({ engine });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES_WITH_ENGINE,
          engine,
          hasEmptySchema: true,
        });
      });

      it('returns true if the engine is not yet initialized', () => {
        mount({ engine: {} });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES,
          hasEmptySchema: true,
        });
      });
    });

    describe('isSampleEngine', () => {
      it('should be set based on engine.sample', () => {
        const engine = { ...mockEngineData, sample: true };
        mount({ engine });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES_WITH_ENGINE,
          engine,
          isSampleEngine: true,
        });
      });
    });

    describe('isMetaEngine', () => {
      it('should be set based on engine.type', () => {
        const engine = { ...mockEngineData, type: EngineTypes.meta };
        mount({ engine });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES_WITH_ENGINE,
          engine,
          isMetaEngine: true,
        });
      });
    });

    describe('hasSchemaErrors', () => {
      it('should be set based on engine.activeReindexJob.numDocumentsWithErrors', () => {
        const engine = {
          ...mockEngineData,
          activeReindexJob: {
            numDocumentsWithErrors: 10,
          },
        };
        mount({ engine });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES_WITH_ENGINE,
          engine,
          hasSchemaErrors: true,
        });
      });
    });

    describe('hasSchemaConflicts', () => {
      it('should be set based on engine.schemaConflicts', () => {
        const engine = {
          ...mockEngineData,
          schemaConflicts: {
            someSchemaField: {
              fieldTypes: {
                number: ['some-engine'],
                date: ['another-engine'],
              },
            },
          },
        };
        mount({ engine });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES_WITH_ENGINE,
          engine,
          hasSchemaConflicts: true,
        });
      });
    });

    describe('hasUnconfirmedSchemaFields', () => {
      it('should be set based on engine.unconfirmedFields', () => {
        const engine = {
          ...mockEngineData,
          unconfirmedFields: ['new_field_1', 'new_field_2'],
        };
        mount({ engine });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES_WITH_ENGINE,
          engine,
          hasUnconfirmedSchemaFields: true,
        });
      });
    });

    describe('searchKey', () => {
      it('should select the first available search key for this engine', () => {
        const engine = {
          ...mockEngineData,
          apiTokens: [
            {
              key: 'private-123xyz',
              name: 'privateKey',
              type: ApiTokenTypes.Private,
            },
            {
              key: 'search-123xyz',
              name: 'searchKey',
              type: ApiTokenTypes.Search,
            },
            {
              key: 'search-8910abc',
              name: 'searchKey2',
              type: ApiTokenTypes.Search,
            },
          ],
        };
        mount({ engine });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES_WITH_ENGINE,
          engine,
          searchKey: 'search-123xyz',
        });
      });

      it('should return an empty string if none are available', () => {
        const engine = {
          ...mockEngineData,
          apiTokens: [
            {
              key: 'private-123xyz',
              name: 'privateKey',
              type: ApiTokenTypes.Private,
            },
          ],
        };
        mount({ engine });

        expect(EngineLogic.values).toEqual({
          ...DEFAULT_VALUES_WITH_ENGINE,
          engine,
          searchKey: '',
        });
      });
    });
  });

  describe('events', () => {
    it('calls stopPolling before unmount', () => {
      mount();
      // Has to be a const to check state after unmount
      const stopPollingSpy = jest.spyOn(EngineLogic.actions, 'stopPolling');

      unmount();
      expect(stopPollingSpy).toHaveBeenCalled();
    });
  });
});
