/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { EnterpriseSearchApplicationDetails } from '../../../../../common/types/search_applications';
import { FetchSearchApplicationApiLogic } from '../../api/search_applications/fetch_search_application_api_logic';

import { EngineIndicesLogic, EngineIndicesLogicValues } from './engine_indices_logic';

const DEFAULT_VALUES: EngineIndicesLogicValues = {
  addIndicesFlyoutOpen: false,
  isLoadingSearchApplication: true,
  searchApplicationData: undefined,
  searchApplicationName: 'my-test-engine',
};

const mockEngineData: EnterpriseSearchApplicationDetails = {
  indices: [
    {
      count: 10,
      health: 'green',
      name: 'search-001',
    },
    {
      count: 1000,
      health: 'yellow',
      name: 'search-002',
    },
  ],
  name: DEFAULT_VALUES.searchApplicationName,
  template: {
    script: {
      lang: 'mustache',
      params: { query_string: '*' },
      source: '',
    },
  },
  updated_at_millis: 1679501369566,
};

describe('SearchApplicationViewLogic', () => {
  const { mount } = new LogicMounter(EngineIndicesLogic);
  const { mount: mountFetchSearchApplicationApiLogic } = new LogicMounter(
    FetchSearchApplicationApiLogic
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mountFetchSearchApplicationApiLogic();
    mount(
      {
        searchApplicationName: DEFAULT_VALUES.searchApplicationName,
      },
      {
        searchApplicationName: DEFAULT_VALUES.searchApplicationName,
      }
    );
  });

  it('has expected default values', () => {
    expect(EngineIndicesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('listeners', () => {
    beforeEach(() => {
      FetchSearchApplicationApiLogic.actions.apiSuccess(mockEngineData);
    });
    it('has engine data', () => {
      expect(EngineIndicesLogic.values.searchApplicationData).toEqual(mockEngineData);
    });

    describe('engineUpdated', () => {
      it('fetches new engine details', () => {
        jest.spyOn(EngineIndicesLogic.actions, 'fetchSearchApplication');

        EngineIndicesLogic.actions.engineUpdated({
          ...mockEngineData,
          indices: mockEngineData.indices.map((index) => index.name),
        });

        expect(EngineIndicesLogic.actions.fetchSearchApplication).toHaveBeenCalledTimes(1);
        expect(EngineIndicesLogic.actions.fetchSearchApplication).toHaveBeenCalledWith({
          name: DEFAULT_VALUES.searchApplicationName,
        });
      });
    });
    describe('removeIndexFromEngine', () => {
      it('updated engine removing the given index', () => {
        jest.spyOn(EngineIndicesLogic.actions, 'updateEngineRequest');

        EngineIndicesLogic.actions.removeIndexFromEngine(mockEngineData.indices[0].name);

        expect(EngineIndicesLogic.actions.updateEngineRequest).toHaveBeenCalledTimes(1);
        expect(EngineIndicesLogic.actions.updateEngineRequest).toHaveBeenCalledWith({
          name: DEFAULT_VALUES.searchApplicationName,
          indices: ['search-002'],
        });
      });
    });
    describe('addIndicesToEngine', () => {
      it('updated engine removing the given index', () => {
        jest.spyOn(EngineIndicesLogic.actions, 'updateEngineRequest');

        EngineIndicesLogic.actions.addIndicesToEngine(['search-003']);

        expect(EngineIndicesLogic.actions.updateEngineRequest).toHaveBeenCalledTimes(1);
        expect(EngineIndicesLogic.actions.updateEngineRequest).toHaveBeenCalledWith({
          name: DEFAULT_VALUES.searchApplicationName,
          indices: ['search-001', 'search-002', 'search-003'],
        });
      });
    });
  });
});
