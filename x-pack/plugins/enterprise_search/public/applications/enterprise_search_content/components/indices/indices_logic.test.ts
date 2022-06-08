/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';
import { indices, searchEngines } from '../../__mocks__';

import { IndicesLogic } from './indices_logic';

describe('IndicesLogic', () => {
  const { mount } = new LogicMounter(IndicesLogic);

  const DEFAULT_VALUES = {
    searchEngines: [],
    indices: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('indicesLoadSuccess', () => {
      it('should set indices', () => {
        IndicesLogic.actions.indicesLoadSuccess(indices);
        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          indices,
        });
      });
    });
    describe('searchEnginesLoadSuccess', () => {
      it('should set searchEngines', () => {
        IndicesLogic.actions.searchEnginesLoadSuccess(searchEngines);
        expect(IndicesLogic.values).toEqual({
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
