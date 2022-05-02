/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';
import { searchIndices, searchEngines } from '../../__mocks__';

import { SearchIndicesLogic } from './search_indices_logic';

describe('SearchIndicesLogic', () => {
  const { mount } = new LogicMounter(SearchIndicesLogic);

  const DEFAULT_VALUES = {
    searchEngines: [],
    searchIndices: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(SearchIndicesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onLoadSearchIndices', () => {
      it('should set searchIndices', () => {
        mount();

        SearchIndicesLogic.actions.onSearchIndicesLoad(searchIndices);
        expect(SearchIndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          searchIndices,
        });
      });
    });
    describe('onLoadSearchEngines', () => {
      it('should set searchEngines', () => {
        mount();

        SearchIndicesLogic.actions.onSearchEnginesLoad(searchEngines);
        expect(SearchIndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          searchEngines,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('loadSearchEngines', () => {});
    describe('loadSearchIndices', () => {});
  });
});
