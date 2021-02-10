/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__';

import { BoostType } from './types';

import { RelevanceTuningLogic } from './';

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
  const searchResults = [{}, {}];

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
