/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers, mockHttpValues } from '../../../__mocks__';

import { mockEngineValues } from '../../__mocks__';

import { nextTick } from '@kbn/test/jest';

import { ActiveField } from './types';

import { SearchUILogic } from './';

describe('SearchUILogic', () => {
  const { mount, expectAction } = new LogicMounter(SearchUILogic);
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
    activeField: ActiveField.None,
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
    describe('onFieldDataLoaded', () => {
      it('sets initial field values fetched from API call and sets dataLoading to false', () => {
        expectAction(() => {
          SearchUILogic.actions.onFieldDataLoaded({
            validFields: ['foo'],
            validSortFields: ['bar'],
            validFacetFields: ['baz'],
          });
        }).toChangeState({
          from: {
            dataLoading: true,
            validFields: [],
            validSortFields: [],
            validFacetFields: [],
          },
          to: {
            dataLoading: false,
            validFields: ['foo'],
            validSortFields: ['bar'],
            validFacetFields: ['baz'],
          },
        });
      });
    });

    describe('onTitleFieldChange', () => {
      it('sets the titleField value', () => {
        expectAction(() => {
          SearchUILogic.actions.onTitleFieldChange('foo');
        }).toChangeState({
          from: { titleField: '' },
          to: { titleField: 'foo' },
        });
      });
    });

    describe('onUrlFieldChange', () => {
      it('sets the urlField value', () => {
        expectAction(() => {
          SearchUILogic.actions.onUrlFieldChange('foo');
        }).toChangeState({
          from: { urlField: '' },
          to: { urlField: 'foo' },
        });
      });
    });

    describe('onFacetFieldsChange', () => {
      it('sets the facetFields value', () => {
        expectAction(() => {
          SearchUILogic.actions.onFacetFieldsChange(['foo']);
        }).toChangeState({
          from: { facetFields: [] },
          to: { facetFields: ['foo'] },
        });
      });
    });

    describe('onSortFieldsChange', () => {
      it('sets the sortFields value', () => {
        expectAction(() => {
          SearchUILogic.actions.onSortFieldsChange(['foo']);
        }).toChangeState({
          from: { sortFields: [] },
          to: { sortFields: ['foo'] },
        });
      });
    });

    describe('onActiveFieldChange', () => {
      it('sets the activeField value', () => {
        expectAction(() => {
          SearchUILogic.actions.onActiveFieldChange(ActiveField.Sort);
        }).toChangeState({
          from: { activeField: '' },
          to: { activeField: ActiveField.Sort },
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
          '/api/app_search/engines/engine1/search_ui/field_config'
        );
        expect(SearchUILogic.actions.onFieldDataLoaded).toHaveBeenCalledWith({
          validFields: ['test'],
          validSortFields: ['test'],
          validFacetFields: ['test'],
          urlField: 'url',
          titleField: 'title',
        });
      });

      it('handles errors', async () => {
        http.get.mockReturnValueOnce(Promise.reject('error'));
        mount();

        SearchUILogic.actions.loadFieldData();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });
});
