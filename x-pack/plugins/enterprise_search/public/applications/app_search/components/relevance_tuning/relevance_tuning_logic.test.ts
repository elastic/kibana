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
} from '../../../__mocks__/kea_logic';
import { mockEngineValues, mockEngineActions } from '../../__mocks__';

import { nextTick } from '@kbn/test-jest-helpers';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';

import { Boost, BoostOperation, BoostType, FunctionalBoostFunction } from './types';

import { RelevanceTuningLogic } from './';

describe('RelevanceTuningLogic', () => {
  const { mount } = new LogicMounter(RelevanceTuningLogic);

  const searchSettings = {
    boosts: {
      foo: [
        {
          type: BoostType.Value,
          factor: 5,
          value: [],
        },
      ],
    },
    search_fields: {},
    precision: 10,
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
      precision: 2,
    },
    unsavedChanges: false,
    filterInputValue: '',
    query: '',
    resultsLoading: false,
    searchResults: null,
    engineHasSchemaFields: false,
    schemaFields: [],
    schemaFieldsWithConflicts: [],
    filteredSchemaFields: [],
    filteredSchemaFieldsWithConflicts: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEngineValues.engineName = 'test-engine';
    mockEngineValues.engine.invalidBoosts = false;
    mockEngineValues.engine.unsearchedUnconfirmedFields = false;
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

      it('should default schemaConflicts if it is not passed', () => {
        mount({
          dataLoading: true,
        });
        RelevanceTuningLogic.actions.onInitializeRelevanceTuning({
          searchSettings,
          schema,
        });

        expect(RelevanceTuningLogic.values.schemaConflicts).toEqual({});
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

    describe('setSearchSettingsResponse', () => {
      it('should set searchSettings state and unsavedChanges to false', () => {
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

    describe('setPrecision', () => {
      it('should set precision inside search settings and set unsavedChanges to true', () => {
        mount();
        RelevanceTuningLogic.actions.setPrecision(9);

        expect(RelevanceTuningLogic.values).toEqual({
          ...DEFAULT_VALUES,
          searchSettings: {
            ...DEFAULT_VALUES.searchSettings,
            precision: 9,
          },
          unsavedChanges: true,
        });
      });
    });
  });

  describe('listeners', () => {
    const { http } = mockHttpValues;
    const { flashAPIErrors, flashSuccessToast, clearFlashMessages } = mockFlashMessageHelpers;
    let scrollToSpy: jest.SpyInstance;
    let confirmSpy: jest.SpyInstance;

    const searchSettingsWithBoost = (boost: Boost) => ({
      ...searchSettings,
      boosts: {
        foo: [
          {
            factor: 1,
            type: BoostType.Functional,
          },
          boost,
        ],
      },
    });

    beforeAll(() => {
      scrollToSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => true);
      confirmSpy = jest.spyOn(window, 'confirm');
    });

    afterAll(() => {
      scrollToSpy.mockRestore();
      confirmSpy.mockRestore();
    });

    describe('initializeRelevanceTuning', () => {
      it('should make an API call and set state based on the normalized response', async () => {
        mount();
        http.get.mockReturnValueOnce(
          Promise.resolve({
            ...relevanceTuningProps,
            searchSettings: {
              ...relevanceTuningProps.searchSettings,
              boosts: {
                foo: [
                  {
                    type: BoostType.Value,
                    factor: 5,
                    value: 5,
                  },
                ],
              },
            },
          })
        );
        jest.spyOn(RelevanceTuningLogic.actions, 'onInitializeRelevanceTuning');

        RelevanceTuningLogic.actions.initializeRelevanceTuning();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/app_search/engines/test-engine/search_settings/details'
        );
        expect(RelevanceTuningLogic.actions.onInitializeRelevanceTuning).toHaveBeenCalledWith({
          ...relevanceTuningProps,
          searchSettings: {
            ...relevanceTuningProps.searchSettings,
            boosts: {
              foo: [
                {
                  type: BoostType.Value,
                  factor: 5,
                  value: ['5'],
                },
              ],
            },
          },
        });
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        RelevanceTuningLogic.actions.initializeRelevanceTuning();
      });
    });

    describe('getSearchResults', () => {
      beforeAll(() => {
        jest.useFakeTimers();
      });

      afterAll(() => {
        jest.useRealTimers();
      });

      it('should make an API call, set state based on the response, and clear flash messages', async () => {
        const searchSettingsWithNewBoostProp = {
          boosts: {
            foo: [
              {
                type: BoostType.Value,
                factor: 5,
                newBoost: true, // This should be deleted before sent to the server
                value: ['test'],
              },
            ],
          },
          search_fields: {
            bar: {
              weight: 1,
            },
          },
        };

        const searchSettingsWithoutNewBoostProp = {
          ...searchSettingsWithNewBoostProp,
          boosts: {
            foo: [
              {
                type: BoostType.Value,
                factor: 5,
                value: ['test'],
              },
            ],
          },
        };

        mount({
          query: 'foo',
          searchSettings: searchSettingsWithNewBoostProp,
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchResults');
        jest.spyOn(RelevanceTuningLogic.actions, 'setResultsLoading');
        http.post.mockReturnValueOnce(
          Promise.resolve({
            results: searchResults,
          })
        );

        RelevanceTuningLogic.actions.getSearchResults();
        jest.runAllTimers();
        await nextTick();

        expect(RelevanceTuningLogic.actions.setResultsLoading).toHaveBeenCalledWith(true);
        expect(http.post).toHaveBeenCalledWith('/internal/app_search/engines/test-engine/search', {
          body: JSON.stringify(searchSettingsWithoutNewBoostProp),
          query: {
            query: 'foo',
          },
        });
        expect(RelevanceTuningLogic.actions.setSearchResults).toHaveBeenCalledWith(searchResults);
        expect(clearFlashMessages).toHaveBeenCalled();
      });

      it("won't send boosts or search_fields on the API call if there are none", async () => {
        mount({
          query: 'foo',
          searchSettings: {
            searchField: {},
            boosts: {},
          },
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchResults');
        http.post.mockReturnValueOnce(
          Promise.resolve({
            results: searchResults,
          })
        );

        RelevanceTuningLogic.actions.getSearchResults();

        jest.runAllTimers();
        await nextTick();

        expect(http.post).toHaveBeenCalledWith('/internal/app_search/engines/test-engine/search', {
          body: '{}',
          query: {
            query: 'foo',
          },
        });
      });

      it('will call clearSearchResults if there is no query', async () => {
        mount({
          query: '',
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchResults');
        jest.spyOn(RelevanceTuningLogic.actions, 'setResultsLoading');
        jest.spyOn(RelevanceTuningLogic.actions, 'clearSearchResults');

        RelevanceTuningLogic.actions.getSearchResults();
        jest.runAllTimers();
        await nextTick();

        expect(RelevanceTuningLogic.actions.clearSearchResults).toHaveBeenCalled();
        expect(RelevanceTuningLogic.actions.setSearchResults).not.toHaveBeenCalled();
        expect(RelevanceTuningLogic.actions.setResultsLoading).not.toHaveBeenCalled();
      });

      it('handles errors', async () => {
        mount({
          query: 'foo',
        });
        http.post.mockReturnValueOnce(Promise.reject('error'));
        RelevanceTuningLogic.actions.getSearchResults();

        jest.runAllTimers();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });

    describe('setSearchSettings', () => {
      it('updates search results whenever search settings are changed', () => {
        mount();
        jest.spyOn(RelevanceTuningLogic.actions, 'getSearchResults');

        RelevanceTuningLogic.actions.setSearchSettings(searchSettings);

        expect(RelevanceTuningLogic.actions.getSearchResults).toHaveBeenCalled();
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
        const searchSettingsWithNewBoostProp = {
          boosts: {
            foo: [
              {
                type: BoostType.Value,
                factor: 5,
                newBoost: true, // This should be deleted before sent to the server
                value: [''],
              },
            ],
          },
        };

        const searchSettingsWithoutNewBoostProp = {
          boosts: {
            foo: [
              {
                type: BoostType.Value,
                factor: 5,
                value: [''],
              },
            ],
          },
        };
        mount({
          searchSettings: searchSettingsWithNewBoostProp,
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'onSearchSettingsSuccess');
        http.put.mockReturnValueOnce(Promise.resolve(searchSettingsWithoutNewBoostProp));

        RelevanceTuningLogic.actions.updateSearchSettings();
        await nextTick();

        expect(http.put).toHaveBeenCalledWith(
          '/internal/app_search/engines/test-engine/search_settings',
          {
            body: JSON.stringify(searchSettingsWithoutNewBoostProp),
          }
        );
        expect(flashSuccessToast).toHaveBeenCalledWith('Relevance was tuned', {
          text: 'The changes will impact your results shortly.',
        });
        expect(RelevanceTuningLogic.actions.onSearchSettingsSuccess).toHaveBeenCalledWith(
          searchSettingsWithoutNewBoostProp
        );
      });

      it('handles errors', async () => {
        mount();
        jest.spyOn(RelevanceTuningLogic.actions, 'onSearchSettingsError');
        http.put.mockReturnValueOnce(Promise.reject('error'));

        RelevanceTuningLogic.actions.updateSearchSettings();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
        expect(RelevanceTuningLogic.actions.onSearchSettingsError).toHaveBeenCalled();
      });

      it('will re-fetch the current engine after settings are updated if there were invalid boosts', async () => {
        mockEngineValues.engine.invalidBoosts = true;
        mount({});
        http.put.mockReturnValueOnce(Promise.resolve(searchSettings));

        RelevanceTuningLogic.actions.updateSearchSettings();
        await nextTick();

        expect(mockEngineActions.initializeEngine).toHaveBeenCalled();
      });

      it('will re-fetch the current engine after settings are updated if there were unconfirmed search fields', async () => {
        mockEngineValues.engine.unsearchedUnconfirmedFields = true;
        mount({});
        http.put.mockReturnValueOnce(Promise.resolve(searchSettings));

        RelevanceTuningLogic.actions.updateSearchSettings();
        await nextTick();

        expect(mockEngineActions.initializeEngine).toHaveBeenCalled();
      });
    });

    describe('resetSearchSettings', () => {
      it('calls and API endpoint, shows a success message, and saves the response', async () => {
        mount();
        jest.spyOn(RelevanceTuningLogic.actions, 'onSearchSettingsSuccess');
        confirmSpy.mockImplementation(() => true);
        http.post.mockReturnValueOnce(Promise.resolve(searchSettings));

        RelevanceTuningLogic.actions.resetSearchSettings();
        await nextTick();

        expect(http.post).toHaveBeenCalledWith(
          '/internal/app_search/engines/test-engine/search_settings/reset'
        );
        expect(flashSuccessToast).toHaveBeenCalledWith('Relevance was reset to default values', {
          text: 'The changes will impact your results shortly.',
        });
        expect(RelevanceTuningLogic.actions.onSearchSettingsSuccess).toHaveBeenCalledWith(
          searchSettings
        );
      });

      it('does nothing if the user does not confirm', async () => {
        mount();
        confirmSpy.mockImplementation(() => false);

        RelevanceTuningLogic.actions.resetSearchSettings();
        await nextTick();

        expect(http.post).not.toHaveBeenCalled();
      });

      it('handles errors', async () => {
        mount();
        jest.spyOn(RelevanceTuningLogic.actions, 'onSearchSettingsError');
        confirmSpy.mockImplementation(() => true);
        http.post.mockReturnValueOnce(Promise.reject('error'));

        RelevanceTuningLogic.actions.resetSearchSettings();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
        expect(RelevanceTuningLogic.actions.onSearchSettingsError).toHaveBeenCalled();
      });
    });

    describe('toggleSearchField', () => {
      it('updates search weight to 1 in search fields when enabling', () => {
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
      });

      it('removes fields from search fields when disabling', () => {
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

        RelevanceTuningLogic.actions.toggleSearchField('bar', true);

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith({
          ...searchSettings,
        });
      });
    });

    describe('updateFieldWeight', () => {
      it('updates the search weight in search fields', () => {
        mount({
          searchSettings,
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');

        RelevanceTuningLogic.actions.updateFieldWeight('foo', 3);

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith({
          ...searchSettings,
          search_fields: {
            foo: {
              weight: 3,
            },
          },
        });
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
                  type: BoostType.Value,
                  value: [''],
                },
              ],
            },
          },
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');

        RelevanceTuningLogic.actions.addBoost('foo', BoostType.Functional);

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith({
          ...searchSettings,
          boosts: {
            foo: [
              {
                factor: 2,
                type: BoostType.Value,
                value: [''],
              },
              {
                factor: 1,
                newBoost: true,
                type: BoostType.Functional,
                function: 'logarithmic',
                operation: 'multiply',
                value: undefined,
              },
            ],
          },
        });
      });

      it('works even if there are no boosts yet', () => {
        mount({
          searchSettings: {
            ...searchSettings,
            boosts: {},
          },
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');

        RelevanceTuningLogic.actions.addBoost('foo', BoostType.Functional);

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith({
          ...searchSettings,
          boosts: {
            foo: [
              {
                factor: 1,
                newBoost: true,
                type: BoostType.Functional,
                function: 'logarithmic',
                operation: 'multiply',
                value: undefined,
              },
            ],
          },
        });
      });
    });

    describe('deleteBoost', () => {
      it('deletes the boost with the given name and index', () => {
        mount({
          searchSettings: {
            ...searchSettings,
            boosts: {
              foo: [
                {
                  factor: 1,
                  type: BoostType.Functional,
                },
                {
                  factor: 2,
                  type: BoostType.Value,
                  value: [''],
                },
              ],
            },
          },
        });
        confirmSpy.mockImplementation(() => true);
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');

        RelevanceTuningLogic.actions.deleteBoost('foo', 1);

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith({
          ...searchSettings,
          boosts: {
            foo: [
              {
                factor: 1,
                type: BoostType.Functional,
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
                  type: BoostType.Functional,
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
                  type: BoostType.Functional,
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
      it('updates the boost factor of the target boost', () => {
        mount({
          searchSettings: searchSettingsWithBoost({
            factor: 1,
            type: BoostType.Functional,
          }),
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');

        RelevanceTuningLogic.actions.updateBoostFactor('foo', 1, 5);

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith(
          searchSettingsWithBoost({
            factor: 5,
            type: BoostType.Functional,
          })
        );
      });

      it('will round decimal numbers', () => {
        mount({
          searchSettings: searchSettingsWithBoost({
            factor: 1,
            type: BoostType.Functional,
          }),
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');

        RelevanceTuningLogic.actions.updateBoostFactor('foo', 1, 5.293191);

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith(
          searchSettingsWithBoost({
            factor: 5.3,
            type: BoostType.Functional,
          })
        );
      });
    });

    describe('updateBoostValue', () => {
      it('will update the boost value and update search results', () => {
        mount({
          searchSettings: searchSettingsWithBoost({
            factor: 1,
            type: BoostType.Functional,
            value: ['a', 'b', 'c'],
          }),
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');

        RelevanceTuningLogic.actions.updateBoostValue('foo', 1, ['x', 'y', 'z']);

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith(
          searchSettingsWithBoost({
            factor: 1,
            type: BoostType.Functional,
            value: ['x', 'y', 'z'],
          })
        );
      });
    });

    describe('updateBoostCenter', () => {
      it('will parse the provided provided value and set the center to that parsed value', () => {
        mount({
          schema: {
            foo: 'number',
          },
          searchSettings: searchSettingsWithBoost({
            factor: 1,
            type: BoostType.Proximity,
            center: 1,
          }),
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');

        RelevanceTuningLogic.actions.updateBoostCenter('foo', 1, '4');

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith(
          searchSettingsWithBoost({
            factor: 1,
            type: BoostType.Proximity,
            center: 4,
          })
        );
      });
    });

    describe('updateBoostSelectOption', () => {
      it('will update the boost', () => {
        mount({
          searchSettings: searchSettingsWithBoost({
            factor: 1,
            type: BoostType.Functional,
          }),
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');

        RelevanceTuningLogic.actions.updateBoostSelectOption(
          'foo',
          1,
          'function',
          FunctionalBoostFunction.Exponential
        );

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith(
          searchSettingsWithBoost({
            factor: 1,
            type: BoostType.Functional,
            function: FunctionalBoostFunction.Exponential,
          })
        );
      });

      it('can also update operation', () => {
        mount({
          searchSettings: searchSettingsWithBoost({
            factor: 1,
            type: BoostType.Functional,
          }),
        });
        jest.spyOn(RelevanceTuningLogic.actions, 'setSearchSettings');

        RelevanceTuningLogic.actions.updateBoostSelectOption(
          'foo',
          1,
          'operation',
          BoostOperation.Add
        );

        expect(RelevanceTuningLogic.actions.setSearchSettings).toHaveBeenCalledWith(
          searchSettingsWithBoost({
            factor: 1,
            type: BoostType.Functional,
            operation: BoostOperation.Add,
          })
        );
      });
    });

    describe('setSearchQuery', () => {
      it('shoulds update search results', () => {
        mount();
        jest.spyOn(RelevanceTuningLogic.actions, 'getSearchResults');

        RelevanceTuningLogic.actions.setSearchQuery('foo');

        expect(RelevanceTuningLogic.actions.getSearchResults).toHaveBeenCalled();
      });
    });

    describe('setPrecision', () => {
      it('shoulds update search results', () => {
        mount();
        jest.spyOn(RelevanceTuningLogic.actions, 'getSearchResults');

        RelevanceTuningLogic.actions.setPrecision(9);

        expect(RelevanceTuningLogic.actions.getSearchResults).toHaveBeenCalled();
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
