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
  expectedAsyncError,
} from '../../../__mocks__';

import { BoostType } from './types';

import { RelevanceTuningLogic } from './relevance_tuning_logic';

jest.mock('../engine', () => ({
  EngineLogic: { values: { engineName: 'test-engine' } },
}));

describe('RelevanceTuningLogic', () => {
  const { mount } = new LogicMounter(RelevanceTuningLogic);

  const searchSettings = {
    boosts: {
      foo: [
        {
          type: 'value' as BoostType,
          factor: 5,
        },
      ],
    },
    search_fields: {},
  };
  const schema = {};
  const schemaConflicts = {};
  const relevanceTuningProps = {
    searchSettings,
    schema,
    schemaConflicts,
  };
  const searchResults = [
    {
      id: {
        raw: '1',
      },
      _meta: {
        id: '1',
        score: 100,
        engine: 'my-engine',
      },
    },
  ];

  const DEFAULT_VALUES = {
    dataLoading: true,
    schema: {},
    schemaConflicts: {},
    searchSettings: {},
    unsavedChanges: false,
    filterInputValue: '',
    query: '',
    resultsLoading: false,
    searchResults: null,
    showSchemaConflictCallout: true,
    engineHasSchemaFields: false,
    schemaFields: [],
    schemaFieldsWithConflicts: [],
    filteredSchemaFields: [],
    filteredSchemaFieldsWithConflicts: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(RelevanceTuningLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onInitializeRelevanceTuning', () => {
      it('should set searchSettings, schema, & schemaConflicts from the API response, and set dataLoading to false', () => {
        mount({
          dataLoading: true,
        });
        RelevanceTuningLogic.actions.onInitializeRelevanceTuning(relevanceTuningProps);

        expect(RelevanceTuningLogic.values).toEqual({
          ...DEFAULT_VALUES,
          searchSettings,
          schema,
          dataLoading: false,
          schemaConflicts,
        });
      });
    });

    describe('setSearchSettings', () => {
      it('should set setSearchSettings and set unsavedChanges to true', () => {
        mount({
          unsavedChanges: false,
        });
        RelevanceTuningLogic.actions.setSearchSettings(searchSettings);

        expect(RelevanceTuningLogic.values).toEqual({
          ...DEFAULT_VALUES,
          searchSettings,
          unsavedChanges: true,
        });
      });
    });

    describe('setFilterValue', () => {
      it('should set filterInputValue', () => {
        mount();
        RelevanceTuningLogic.actions.setFilterValue('foo');

        expect(RelevanceTuningLogic.values).toEqual({
          ...DEFAULT_VALUES,
          filterInputValue: 'foo',
        });
      });
    });

    describe('setSearchQuery', () => {
      it('should set query', () => {
        mount();
        RelevanceTuningLogic.actions.setSearchQuery('foo');

        expect(RelevanceTuningLogic.values).toEqual({
          ...DEFAULT_VALUES,
          query: 'foo',
        });
      });
    });

    describe('setSearchResults', () => {
      it('should set searchResults and set resultLoading to false', () => {
        mount({
          resultsLoading: true,
        });
        RelevanceTuningLogic.actions.setSearchResults(searchResults);

        expect(RelevanceTuningLogic.values).toEqual({
          ...DEFAULT_VALUES,
          searchResults,
          resultsLoading: false,
        });
      });
    });

    describe('setResultsLoading', () => {
      it('should set resultsLoading', () => {
        mount({
          resultsLoading: false,
        });
        RelevanceTuningLogic.actions.setResultsLoading(true);

        expect(RelevanceTuningLogic.values).toEqual({
          ...DEFAULT_VALUES,
          resultsLoading: true,
        });
      });
    });

    describe('clearSearchResults', () => {
      it('should set searchResults', () => {
        mount({
          searchResults: [{}],
        });
        RelevanceTuningLogic.actions.clearSearchResults();

        expect(RelevanceTuningLogic.values).toEqual({
          ...DEFAULT_VALUES,
          searchResults: null,
        });
      });
    });

    describe('resetSearchSettingsState', () => {
      it('should set dataLoading', () => {
        mount({
          dataLoading: false,
        });
        RelevanceTuningLogic.actions.resetSearchSettingsState();

        expect(RelevanceTuningLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: true,
        });
      });
    });

    describe('dismissSchemaConflictCallout', () => {
      it('should set showSchemaConflictCallout to false', () => {
        mount({
          showSchemaConflictCallout: true,
        });
        RelevanceTuningLogic.actions.dismissSchemaConflictCallout();

        expect(RelevanceTuningLogic.values).toEqual({
          ...DEFAULT_VALUES,
          showSchemaConflictCallout: false,
        });
      });
    });

    describe('setSearchSettingsResponse', () => {
      it('should set state', () => {
        mount({
          unsavedChanges: true,
        });
        RelevanceTuningLogic.actions.setSearchSettingsResponse(searchSettings);

        expect(RelevanceTuningLogic.values).toEqual({
          ...DEFAULT_VALUES,
          searchSettings,
          unsavedChanges: false,
        });
      });
    });
  });

  describe('listeners', () => {
    const { http } = mockHttpValues;
    const { flashAPIErrors } = mockFlashMessageHelpers;

    describe('initializeRelevanceTuning', () => {
      it('should make an API call and set state based on the response', async () => {
        mount();
        const promise = Promise.resolve(relevanceTuningProps);
        http.get.mockReturnValueOnce(promise);
        jest.spyOn(RelevanceTuningLogic.actions, 'onInitializeRelevanceTuning');

        RelevanceTuningLogic.actions.initializeRelevanceTuning();
        await promise;

        expect(http.get).toHaveBeenCalledWith(
          '/api/app_search/engines/test-engine/search_settings/details'
        );
        expect(RelevanceTuningLogic.actions.onInitializeRelevanceTuning).toHaveBeenCalledWith(
          relevanceTuningProps
        );
      });

      it('handles errors', async () => {
        mount();
        const promise = Promise.reject('error');
        http.get.mockReturnValueOnce(promise);

        RelevanceTuningLogic.actions.initializeRelevanceTuning();
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });

    // Debouncing with kea's `breakpoint` is challenging. It uses a timeout,
    // which we don't have access to, so we need to use fake timers. Additionally,
    // it awaits a promise we don't have access to. To handle that situation,
    // we use the waitATick function.
    describe('getSearchResults', () => {
      const waitATick = () => {
        let promiseResolve: any;
        const promise = new Promise((resolve) => (promiseResolve = resolve));
        setTimeout(() => promiseResolve());
        jest.runAllTimers();
        return promise;
      };

      beforeAll(() => {
        jest.useFakeTimers();
      });

      afterAll(() => {
        jest.useRealTimers();
      });

      it('should make an API call and set state based on the response', async () => {
        mount({
          query: 'foo',
          searchSettings: {
            boosts: {
              foo: [
                {
                  type: 'value' as BoostType,
                  factor: 5,
                  newBoost: true, // This should be deleted before sent to the server
                },
              ],
            },
            search_fields: {},
          },
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchResults');
        jest.spyOn(RelevanceTuningLogic.actions, 'setResultsLoading');

        const promise = Promise.resolve({
          results: searchResults,
        });
        http.post.mockReturnValueOnce(promise);
        RelevanceTuningLogic.actions.getSearchResults();

        await waitATick();
        await waitATick();
        await promise;

        expect(RelevanceTuningLogic.actions.setResultsLoading).toHaveBeenCalledWith(true);
        expect(http.post).toHaveBeenCalledWith(
          '/api/app_search/engines/test-engine/search_settings_search',
          {
            body: '{"boosts":{"foo":[{"type":"value","factor":5}]},"search_fields":{}}',
            query: {
              query: 'foo',
            },
          }
        );
        expect(RelevanceTuningLogic.actions.setSearchResults).toHaveBeenCalledWith(searchResults);
      });

      it("won't send boosts if on the API call if there are none", async () => {
        mount({
          query: 'foo',
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchResults');

        const promise = Promise.resolve({
          results: searchResults,
        });
        http.post.mockReturnValueOnce(promise);
        RelevanceTuningLogic.actions.getSearchResults();

        await waitATick();
        await waitATick();
        await promise;

        expect(http.post).toHaveBeenCalledWith(
          '/api/app_search/engines/test-engine/search_settings_search',
          {
            body: '{}',
            query: {
              query: 'foo',
            },
          }
        );
      });

      it('will call clearSearchResults if there is no query', async () => {
        mount({
          query: '',
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchResults');
        jest.spyOn(RelevanceTuningLogic.actions, 'setResultsLoading');
        jest.spyOn(RelevanceTuningLogic.actions, 'clearSearchResults');

        RelevanceTuningLogic.actions.getSearchResults();
        await waitATick();
        await waitATick();

        expect(RelevanceTuningLogic.actions.clearSearchResults).toHaveBeenCalled();
        expect(RelevanceTuningLogic.actions.setSearchResults).not.toHaveBeenCalled();
        expect(RelevanceTuningLogic.actions.setResultsLoading).not.toHaveBeenCalled();
      });

      it('handles errors', async () => {
        mount({
          query: 'foo',
        });

        const promise = Promise.reject('error');
        http.post.mockReturnValueOnce(promise);
        RelevanceTuningLogic.actions.getSearchResults();

        await waitATick();
        await waitATick();
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });

  describe('selectors', () => {
    describe('engineHasSchemaFields', () => {
      it('should return false if there is only a single field in a schema', () => {
        // This is because if a schema only has a single field, it is "id", which we do not
        // consider a tunable field.
        mount({
          schema: {
            id: 'foo',
          },
        });
        expect(RelevanceTuningLogic.values.engineHasSchemaFields).toEqual(false);
      });

      it('should return true otherwise', () => {
        mount({
          schema: {
            id: 'foo',
            bar: 'bar',
          },
        });
        expect(RelevanceTuningLogic.values.engineHasSchemaFields).toEqual(true);
      });
    });

    describe('schemaFields', () => {
      it('should return the list of field names from the schema', () => {
        mount({
          schema: {
            id: 'foo',
            bar: 'bar',
          },
        });
        expect(RelevanceTuningLogic.values.schemaFields).toEqual(['id', 'bar']);
      });
    });

    describe('schemaFieldsWithConflicts', () => {
      it('should return the list of field names that have schema conflicts', () => {
        mount({
          schemaConflicts: {
            foo: {
              text: ['source_engine_1'],
              number: ['source_engine_2'],
            },
          },
        });
        expect(RelevanceTuningLogic.values.schemaFieldsWithConflicts).toEqual(['foo']);
      });
    });

    describe('filteredSchemaFields', () => {
      it('should return a list of schema field names that contain the text from filterInputValue ', () => {
        mount({
          filterInputValue: 'ba',
          schema: {
            id: 'string',
            foo: 'string',
            bar: 'string',
            baz: 'string',
          },
        });
        expect(RelevanceTuningLogic.values.filteredSchemaFields).toEqual(['bar', 'baz']);
      });

      it('should return all schema fields if there is no filter applied', () => {
        mount({
          filterTerm: '',
          schema: {
            id: 'string',
            foo: 'string',
            bar: 'string',
            baz: 'string',
          },
        });
        expect(RelevanceTuningLogic.values.filteredSchemaFields).toEqual([
          'id',
          'foo',
          'bar',
          'baz',
        ]);
      });
    });

    describe('filteredSchemaFieldsWithConflicts', () => {
      it('should return a list of schema field names that contain the text from filterInputValue, and if that field has a schema conflict', () => {
        mount({
          filterInputValue: 'ba',
          schema: {
            id: 'string',
            foo: 'string',
            bar: 'string',
            baz: 'string',
          },
          schemaConflicts: {
            bar: {
              text: ['source_engine_1'],
              number: ['source_engine_2'],
            },
          },
        });
        expect(RelevanceTuningLogic.values.filteredSchemaFieldsWithConflicts).toEqual(['bar']);
      });
    });
  });
});
