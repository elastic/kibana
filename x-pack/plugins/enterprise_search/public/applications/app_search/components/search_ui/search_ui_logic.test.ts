/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__';

import { mockEngineValues } from '../../__mocks__';

import { SearchUILogic } from './';

describe('SearchUILogic', () => {
  const DEFAULT_VALUES = {
    dataLoading: true,
    validFields: [],
    validSortFields: [],
    validFacetFields: [],
  };

  const { mount } = new LogicMounter(SearchUILogic);

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
  });
});
