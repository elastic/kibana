/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers, mockHttpValues } from '../../../__mocks__';

import { mockEngineValues } from '../../__mocks__';

import { nextTick } from '@kbn/test/jest';

import { SearchUILogic } from './';

describe('SearchUILogic', () => {
  const { mount } = new LogicMounter(SearchUILogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors } = mockFlashMessageHelpers;

  const DEFAULT_VALUES = {
    dataLoading: true,
    validFields: [],
    validSortFields: [],
    validFacetFields: [],
    titleField: '',
    urlField: '',
    facetFields: [],
    sortFields: [],
    activeField: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEngineValues.engineName = 'engine1';
  });

  it('has expected default values', () => {
    mount();
    expect(SearchUILogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('dataInitialized', () => {
      it('sets initial field values fetched from API call and sets dataLoading to false', () => {
        mount({
          validFields: [],
          validSortFields: [],
          validFacetFields: [],
        });

        SearchUILogic.actions.dataInitialized({
          validFields: ['foo'],
          validSortFields: ['bar'],
          validFacetFields: ['baz'],
        });

        expect(SearchUILogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: false,
          validFields: ['foo'],
          validSortFields: ['bar'],
          validFacetFields: ['baz'],
        });
      });
    });

    describe('titleFieldChanged', () => {
      it('sets the titleField value', () => {
        mount({ titleField: '' });
        SearchUILogic.actions.titleFieldChanged('foo');
        expect(SearchUILogic.values).toEqual({
          ...DEFAULT_VALUES,
          titleField: 'foo',
        });
      });
    });

    describe('URLFieldChanged', () => {
      it('sets the urlField value', () => {
        mount({ urlField: '' });
        SearchUILogic.actions.URLFieldChanged('foo');
        expect(SearchUILogic.values).toEqual({
          ...DEFAULT_VALUES,
          urlField: 'foo',
        });
      });
    });

    describe('facetFieldsChanged', () => {
      it('sets the facetFields value', () => {
        mount({ facetFields: [] });
        SearchUILogic.actions.facetFieldsChanged(['foo']);
        expect(SearchUILogic.values).toEqual({
          ...DEFAULT_VALUES,
          facetFields: ['foo'],
        });
      });
    });

    describe('sortFieldsChanged', () => {
      it('sets the sortFields value', () => {
        mount({ sortFields: [] });
        SearchUILogic.actions.sortFieldsChanged(['foo']);
        expect(SearchUILogic.values).toEqual({
          ...DEFAULT_VALUES,
          sortFields: ['foo'],
        });
      });
    });

    describe('activeFieldChanged', () => {
      it('sets the activeField value', () => {
        mount({ activeField: '' });
        SearchUILogic.actions.activeFieldChanged('foo');
        expect(SearchUILogic.values).toEqual({
          ...DEFAULT_VALUES,
          activeField: 'foo',
        });
      });
    });
  });

  describe('listeners', () => {
    const MOCK_RESPONSE = {
      validFields: ['test'],
      validSortFields: ['test'],
      validFacetFields: ['test'],
    };

    describe('initializeData', () => {
      it('should make an API call and set state based on the response', async () => {
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_RESPONSE));
        mount();
        jest.spyOn(SearchUILogic.actions, 'dataInitialized');

        SearchUILogic.actions.initializeData();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/api/app_search/engines/engine1/reference_application/field_config'
        );
        expect(SearchUILogic.actions.dataInitialized).toHaveBeenCalledWith(MOCK_RESPONSE);
      });

      it('handles errors', async () => {
        http.get.mockReturnValueOnce(Promise.reject('error'));
        mount();

        SearchUILogic.actions.initializeData();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });
});
