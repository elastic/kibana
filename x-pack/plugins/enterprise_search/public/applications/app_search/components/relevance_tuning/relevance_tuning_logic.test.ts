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
    searchSettings: {
      boosts: {},
      search_fields: {},
    },
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
    const { flashAPIErrors, setSuccessMessage } = mockFlashMessageHelpers;
    let scrollToSpy: any;
    let confirmSpy: any;

    beforeAll(() => {
      scrollToSpy = jest.spyOn(window, 'scrollTo');
      scrollToSpy.mockImplementation(() => true);
      confirmSpy = jest.spyOn(window, 'confirm');
    });

    afterAll(() => {
      scrollToSpy.mockRestore();
    });

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
            body: '{"boosts":{"foo":[{"type":"value","factor":5}]}}',
            query: {
              query: 'foo',
            },
          }
        );
        expect(RelevanceTuningLogic.actions.setSearchResults).toHaveBeenCalledWith(searchResults);
      });

      it("won't send boosts or search_fields on the API call if there are none", async () => {
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

    describe('onSearchSettingsSuccess', () => {
      it('should save the response, trigger a new search, and then scroll to the top', () => {
        mount();
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettingsResponse');
        jest.spyOn(RelevanceTuningLogic.actions, 'getSearchResults');

        RelevanceTuningLogic.actions.onSearchSettingsSuccess(searchSettings);

        expect(RelevanceTuningLogic.actions.setSearchSettingsResponse).toHaveBeenCalledWith(
          searchSettings
        );
        expect(RelevanceTuningLogic.actions.getSearchResults).toHaveBeenCalled();
        expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
      });
    });

    describe('onSearchSettingsError', () => {
      it('scrolls to the top', () => {
        mount();
        RelevanceTuningLogic.actions.onSearchSettingsError();
        expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
      });
    });

    describe('updateSearchSettings', () => {
      it('calls an API endpoint and handles success response', async () => {
        mount({
          searchSettings,
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'onSearchSettingsSuccess');

        const promise = Promise.resolve(searchSettings);
        http.put.mockReturnValueOnce(promise);
        RelevanceTuningLogic.actions.updateSearchSettings();

        await promise;

        expect(http.put).toHaveBeenCalledWith(
          '/api/app_search/engines/test-engine/search_settings',
          {
            body: JSON.stringify(searchSettings),
          }
        );
        expect(setSuccessMessage).toHaveBeenCalledWith(
          'Relevance successfully tuned. The changes will impact your results shortly.'
        );
        expect(RelevanceTuningLogic.actions.onSearchSettingsSuccess).toHaveBeenCalledWith(
          searchSettings
        );
      });

      it('handles errors', async () => {
        mount();
        jest.spyOn(RelevanceTuningLogic.actions, 'onSearchSettingsError');
        const promise = Promise.reject('error');
        http.put.mockReturnValueOnce(promise);

        RelevanceTuningLogic.actions.updateSearchSettings();
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
        expect(RelevanceTuningLogic.actions.onSearchSettingsError).toHaveBeenCalled();
      });
    });

    describe('resetSearchSettings', () => {
      it('calls and API endpoint, shows a success message, and saves the response', async () => {
        mount();
        jest.spyOn(RelevanceTuningLogic.actions, 'onSearchSettingsSuccess');
        confirmSpy.mockImplementation(() => true);

        const promise = Promise.resolve(searchSettings);
        http.post.mockReturnValueOnce(promise);
        RelevanceTuningLogic.actions.resetSearchSettings();

        await promise;

        expect(http.post).toHaveBeenCalledWith(
          '/api/app_search/engines/test-engine/search_settings/reset'
        );
        expect(setSuccessMessage).toHaveBeenCalledWith(
          'Relevance has been reset to default values. The change will impact your results shortly.'
        );
        expect(RelevanceTuningLogic.actions.onSearchSettingsSuccess).toHaveBeenCalledWith(
          searchSettings
        );
      });

      it('does nothing if the user does not confirm', async () => {
        mount();
        confirmSpy.mockImplementation(() => false);

        RelevanceTuningLogic.actions.resetSearchSettings();

        expect(http.post).not.toHaveBeenCalledWith(
          '/api/app_search/engines/test-engine/search_settings/reset'
        );
      });

      it('handles errors', async () => {
        mount();
        jest.spyOn(RelevanceTuningLogic.actions, 'onSearchSettingsError');
        confirmSpy.mockImplementation(() => true);
        const promise = Promise.reject('error');
        http.post.mockReturnValueOnce(promise);

        RelevanceTuningLogic.actions.resetSearchSettings();
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
        expect(RelevanceTuningLogic.actions.onSearchSettingsError).toHaveBeenCalled();
      });
    });

    describe('toggleSearchField', () => {
      it('updates search weight to 1 in search fields and then triggers a new search when enabling', () => {
        mount({
          searchSettings: {
            ...searchSettings,
            search_fields: {
              bar: {
                weight: 1,
              },
            },
          },
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');
        jest.spyOn(RelevanceTuningLogic.actions, 'getSearchResults');

        RelevanceTuningLogic.actions.toggleSearchField('foo', false);

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith({
          ...searchSettings,
          search_fields: {
            bar: {
              weight: 1,
            },
            foo: {
              weight: 1,
            },
          },
        });
        expect(RelevanceTuningLogic.actions.getSearchResults).toHaveBeenCalled();
      });

      it('removes fields from search fields and triggers a new search when disabling', () => {
        mount({
          searchSettings: {
            ...searchSettings,
            search_fields: {
              bar: {
                weight: 1,
              },
            },
          },
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');
        jest.spyOn(RelevanceTuningLogic.actions, 'getSearchResults');

        RelevanceTuningLogic.actions.toggleSearchField('bar', true);

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith({
          ...searchSettings,
          search_fields: {
            bar: undefined,
          },
        });
        expect(RelevanceTuningLogic.actions.getSearchResults).toHaveBeenCalled();
      });
    });

    describe('updateFieldWeight', () => {
      it('updates the search weight in search fields and then triggers a new search', () => {
        mount({
          searchSettings,
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');
        jest.spyOn(RelevanceTuningLogic.actions, 'getSearchResults');

        RelevanceTuningLogic.actions.updateFieldWeight('foo', 3);

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith({
          ...searchSettings,
          search_fields: {
            foo: {
              weight: 3,
            },
          },
        });
        expect(RelevanceTuningLogic.actions.getSearchResults).toHaveBeenCalled();
      });

      it('will round decimal numbers', () => {
        mount({
          searchSettings,
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');

        RelevanceTuningLogic.actions.updateFieldWeight('foo', 3.9393939);

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith({
          ...searchSettings,
          search_fields: {
            foo: {
              weight: 3.9,
            },
          },
        });
      });
    });

    describe('addBoost', () => {
      it('adds a boost of given type for the given field', () => {
        mount({
          searchSettings: {
            ...searchSettings,
            boosts: {
              foo: [
                {
                  factor: 2,
                  type: 'value',
                },
              ],
            },
          },
        });

        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');

        RelevanceTuningLogic.actions.addBoost('foo', 'functional');

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith({
          ...searchSettings,
          boosts: {
            foo: [
              {
                factor: 2,
                type: 'value',
              },
              {
                factor: 1,
                newBoost: true,
                type: 'functional',
              },
            ],
          },
        });
      });
    });

    describe('deleteBoost', () => {
      it('deletes the boost with the given name and index and updates search results', () => {
        mount({
          searchSettings: {
            ...searchSettings,
            boosts: {
              foo: [
                {
                  factor: 1,
                  type: 'functional',
                },
                {
                  factor: 2,
                  type: 'value',
                },
              ],
            },
          },
        });
        confirmSpy.mockImplementation(() => true);
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');
        jest.spyOn(RelevanceTuningLogic.actions, 'getSearchResults');

        RelevanceTuningLogic.actions.deleteBoost('foo', 1);

        expect(RelevanceTuningLogic.actions.getSearchResults).toHaveBeenCalled();
        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith({
          ...searchSettings,
          boosts: {
            foo: [
              {
                factor: 1,
                type: 'functional',
              },
            ],
          },
        });
      });

      it('will delete they field key in boosts if this is the last boost or that field', () => {
        mount({
          searchSettings: {
            ...searchSettings,
            boosts: {
              foo: [
                {
                  factor: 1,
                  type: 'functional',
                },
              ],
            },
          },
        });
        confirmSpy.mockImplementation(() => true);
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');

        RelevanceTuningLogic.actions.deleteBoost('foo', 0);

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith({
          ...searchSettings,
          boosts: {},
        });
      });

      it('will do nothing if the user does not confirm', () => {
        mount({
          searchSettings: {
            ...searchSettings,
            boosts: {
              foo: [
                {
                  factor: 1,
                  type: 'functional',
                },
              ],
            },
          },
        });
        confirmSpy.mockImplementation(() => false);
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');

        RelevanceTuningLogic.actions.deleteBoost('foo', 0);

        expect(RelevanceTuningLogic.actions.setSearchSettings).not.toHaveBeenCalled();
      });
    });

    describe('updateBoostFactor', () => {
      it('updates the boost factor of the target boost and updates search results', () => {
        mount({
          searchSettings: {
            ...searchSettings,
            boosts: {
              foo: [
                {
                  factor: 1,
                  type: 'functional',
                },
              ],
            },
          },
        });

        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');
        jest.spyOn(RelevanceTuningLogic.actions, 'getSearchResults');

        RelevanceTuningLogic.actions.updateBoostFactor('foo', 0, 5);

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith({
          ...searchSettings,
          boosts: {
            foo: [
              {
                factor: 5,
                type: 'functional',
              },
            ],
          },
        });
        expect(RelevanceTuningLogic.actions.getSearchResults).toHaveBeenCalled();
      });

      it('will round decimal numbers', () => {
        mount({
          searchSettings: {
            ...searchSettings,
            boosts: {
              foo: [
                {
                  factor: 1,
                  type: 'functional',
                },
              ],
            },
          },
        });

        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');

        RelevanceTuningLogic.actions.updateBoostFactor('foo', 0, 5.293191);

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith({
          ...searchSettings,
          boosts: {
            foo: [
              {
                factor: 5.3,
                type: 'functional',
              },
            ],
          },
        });
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
