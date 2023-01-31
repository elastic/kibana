/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { EnterpriseSearchEngineDetails } from '../../../../../common/types/engines';
import { FetchEngineApiLogic } from '../../api/engines/fetch_engine_api_logic';

import { EngineIndicesLogic, EngineIndicesLogicValues } from './engine_indices_logic';

const DEFAULT_VALUES: EngineIndicesLogicValues = {
  engineData: undefined,
  engineName: 'my-test-engine',
};

const mockEngineData: EnterpriseSearchEngineDetails = {
  created: '1999-12-31T23:59:59Z',
  indices: [
    {
      count: 10,
      health: 'green',
      name: 'search-001',
      source: 'api',
    },
    {
      count: 1000,
      health: 'yellow',
      name: 'search-002',
      source: 'crawler',
    },
  ],
  name: DEFAULT_VALUES.engineName,
  updated: '1999-12-31T23:59:59Z',
};

describe('EngineViewLogic', () => {
  const { mount } = new LogicMounter(EngineIndicesLogic);
  const { mount: mountFetchEngineApiLogic } = new LogicMounter(FetchEngineApiLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mountFetchEngineApiLogic();
    mount(
      {
        engineName: DEFAULT_VALUES.engineName,
      },
      {
        engineName: DEFAULT_VALUES.engineName,
      }
    );
  });

  it('has expected default values', () => {
    expect(EngineIndicesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('listeners', () => {
    beforeEach(() => {
      FetchEngineApiLogic.actions.apiSuccess(mockEngineData);
    });
    it('has engine data', () => {
      expect(EngineIndicesLogic.values.engineData).toEqual(mockEngineData);
    });

    describe('engineUpdated', () => {
      it('fetches new engine details', () => {
        jest.spyOn(EngineIndicesLogic.actions, 'fetchEngine');

        EngineIndicesLogic.actions.engineUpdated({
          ...mockEngineData,
          indices: mockEngineData.indices.map((index) => index.name),
        });

        expect(EngineIndicesLogic.actions.fetchEngine).toHaveBeenCalledTimes(1);
        expect(EngineIndicesLogic.actions.fetchEngine).toHaveBeenCalledWith({
          engineName: DEFAULT_VALUES.engineName,
        });
      });
    });
    describe('removeIndexFromEngine', () => {
      it('updated engine removing the given index', () => {
        jest.spyOn(EngineIndicesLogic.actions, 'updateEngineRequest');

        EngineIndicesLogic.actions.removeIndexFromEngine(mockEngineData.indices[0].name);

        expect(EngineIndicesLogic.actions.updateEngineRequest).toHaveBeenCalledTimes(1);
        expect(EngineIndicesLogic.actions.updateEngineRequest).toHaveBeenCalledWith({
          engineName: DEFAULT_VALUES.engineName,
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
          engineName: DEFAULT_VALUES.engineName,
          indices: ['search-001', 'search-002', 'search-003'],
        });
      });
    });
  });
});
