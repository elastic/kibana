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
import { mockEngineValues } from '../../__mocks__';

import { nextTick } from '@kbn/test-jest-helpers';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';

import { ActiveField } from './types';

import { SearchUILogic } from './';

describe('SearchUILogic', () => {
  const { mount } = new LogicMounter(SearchUILogic);
  const { http } = mockHttpValues;
  const { setErrorMessage } = mockFlashMessageHelpers;

  const DEFAULT_VALUES = {
    dataLoading: true,
    validFields: [],
    validSortFields: [],
    validFacetFields: [],
    titleField: '',
    urlField: '',
    thumbnailField: '',
    facetFields: [],
    sortFields: [],
    activeField: ActiveField.None,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEngineValues.engineName = 'engine1';
    mockEngineValues.searchKey = 'search-abc123';
  });

  it('has expected default values', () => {
    mount();
    expect(SearchUILogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onFieldDataLoaded', () => {
      it('sets initial field values fetched from API call and sets dataLoading to false', () => {
        mount({
          validFields: [],
          validSortFields: [],
          validFacetFields: [],
        });

        SearchUILogic.actions.onFieldDataLoaded({
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

    describe('onTitleFieldChange', () => {
      it('sets the titleField value', () => {
        mount({ titleField: '' });
        SearchUILogic.actions.onTitleFieldChange('foo');
        expect(SearchUILogic.values).toEqual({
          ...DEFAULT_VALUES,
          titleField: 'foo',
        });
      });
    });

    describe('onUrlFieldChange', () => {
      it('sets the urlField value', () => {
        mount({ urlField: '' });
        SearchUILogic.actions.onUrlFieldChange('foo');
        expect(SearchUILogic.values).toEqual({
          ...DEFAULT_VALUES,
          urlField: 'foo',
        });
      });
    });

    describe('onThumbnailFieldChange', () => {
      it('sets the thumbnailField value', () => {
        mount({ thumbnailField: '' });
        SearchUILogic.actions.onThumbnailFieldChange('foo');
        expect(SearchUILogic.values).toEqual({
          ...DEFAULT_VALUES,
          thumbnailField: 'foo',
        });
      });
    });

    describe('onFacetFieldsChange', () => {
      it('sets the facetFields value', () => {
        mount({ facetFields: [] });
        SearchUILogic.actions.onFacetFieldsChange(['foo']);
        expect(SearchUILogic.values).toEqual({
          ...DEFAULT_VALUES,
          facetFields: ['foo'],
        });
      });
    });

    describe('onSortFieldsChange', () => {
      it('sets the sortFields value', () => {
        mount({ sortFields: [] });
        SearchUILogic.actions.onSortFieldsChange(['foo']);
        expect(SearchUILogic.values).toEqual({
          ...DEFAULT_VALUES,
          sortFields: ['foo'],
        });
      });
    });

    describe('onActiveFieldChange', () => {
      it('sets the activeField value', () => {
        mount({ activeField: '' });
        SearchUILogic.actions.onActiveFieldChange(ActiveField.Sort);
        expect(SearchUILogic.values).toEqual({
          ...DEFAULT_VALUES,
          activeField: ActiveField.Sort,
        });
      });
    });
  });

  describe('listeners', () => {
    const MOCK_RESPONSE = {
      validFields: ['test'],
      validSortFields: ['test'],
      validFacetFields: ['test'],
      defaultValues: {
        urlField: 'url',
        titleField: 'title',
      },
    };

    describe('loadFieldData', () => {
      it('should make an API call and set state based on the response', async () => {
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_RESPONSE));
        mount();
        jest.spyOn(SearchUILogic.actions, 'onFieldDataLoaded');

        SearchUILogic.actions.loadFieldData();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/app_search/engines/engine1/search_ui/field_config'
        );
        expect(SearchUILogic.actions.onFieldDataLoaded).toHaveBeenCalledWith({
          validFields: ['test'],
          validSortFields: ['test'],
          validFacetFields: ['test'],
          urlField: 'url',
          titleField: 'title',
        });
      });

      it('will short circuit the call if there is no searchKey available for this engine', async () => {
        mockEngineValues.searchKey = '';
        mount();

        SearchUILogic.actions.loadFieldData();

        expect(setErrorMessage).toHaveBeenCalledWith(
          "It looks like you don't have any Public Search Keys with access to the 'engine1' engine. Please visit the Credentials page to set one up."
        );
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        SearchUILogic.actions.loadFieldData();
      });
    });
  });
});
