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
    mount();
  });

  it('has expected default values', () => {
    expect(SearchIndicesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('searchIndicesLoadSuccess', () => {
      it('should set searchIndices', () => {
        SearchIndicesLogic.actions.searchIndicesLoadSuccess(searchIndices);
        expect(SearchIndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          searchIndices,
        });
      });
    });
    describe('searchEnginesLoadSuccess', () => {
      it('should set searchEngines', () => {
        SearchIndicesLogic.actions.searchEnginesLoadSuccess(searchEngines);
        expect(SearchIndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          searchEngines,
        });
      });
    });
  });

  describe.skip('listeners', () => {
    describe('loadSearchEngines', () => {});
    describe('loadSearchIndices', () => {});
  });
});
