/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogicMounter, mockHttpValues } from '../../../__mocks__';

import { EngineDetails } from '../engine/types';
import { EnginesLogic } from './';

describe('EnginesLogic', () => {
  const { mount } = new LogicMounter(EnginesLogic);
  const { http } = mockHttpValues;

  const DEFAULT_VALUES = {
    dataLoading: true,
    engines: [],
    enginesTotal: 0,
    enginesPage: 1,
    metaEngines: [],
    metaEnginesTotal: 0,
    metaEnginesPage: 1,
  };

  const MOCK_ENGINE = {
    name: 'hello-world',
    created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
    document_count: 50,
    field_count: 10,
  } as EngineDetails;
  const MOCK_ENGINES_API_RESPONSE = {
    results: [MOCK_ENGINE],
    meta: {
      page: {
        current: 1,
        total_pages: 10,
        total_results: 100,
        size: 10,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(EnginesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onEnginesLoad', () => {
      describe('dataLoading', () => {
        it('should be set to false', () => {
          mount();
          EnginesLogic.actions.onEnginesLoad({ engines: [], total: 0 });

          expect(EnginesLogic.values).toEqual({
            ...DEFAULT_VALUES,
            dataLoading: false,
          });
        });
      });

      describe('engines & enginesTotal', () => {
        it('should be set to the provided value', () => {
          mount();
          EnginesLogic.actions.onEnginesLoad({ engines: [MOCK_ENGINE], total: 100 });

          expect(EnginesLogic.values).toEqual({
            ...DEFAULT_VALUES,
            dataLoading: false,
            engines: [MOCK_ENGINE],
            enginesTotal: 100,
          });
        });
      });
    });

    describe('onMetaEnginesLoad', () => {
      describe('engines & enginesTotal', () => {
        it('should be set to the provided value', () => {
          mount();
          EnginesLogic.actions.onMetaEnginesLoad({ engines: [MOCK_ENGINE], total: 1 });

          expect(EnginesLogic.values).toEqual({
            ...DEFAULT_VALUES,
            metaEngines: [MOCK_ENGINE],
            metaEnginesTotal: 1,
          });
        });
      });
    });

    describe('onEnginesPagination', () => {
      describe('enginesPage', () => {
        it('should be set to the provided value', () => {
          mount();
          EnginesLogic.actions.onEnginesPagination(2);

          expect(EnginesLogic.values).toEqual({
            ...DEFAULT_VALUES,
            enginesPage: 2,
          });
        });
      });
    });

    describe('onMetaEnginesPagination', () => {
      describe('metaEnginesPage', () => {
        it('should be set to the provided value', () => {
          mount();
          EnginesLogic.actions.onMetaEnginesPagination(99);

          expect(EnginesLogic.values).toEqual({
            ...DEFAULT_VALUES,
            metaEnginesPage: 99,
          });
        });
      });
    });

    describe('loadEngines', () => {
      it('should call the engines API endpoint and set state based on the results', async () => {
        const promise = Promise.resolve(MOCK_ENGINES_API_RESPONSE);
        http.get.mockReturnValueOnce(promise);
        mount({ enginesPage: 10 });
        jest.spyOn(EnginesLogic.actions, 'onEnginesLoad');

        EnginesLogic.actions.loadEngines();
        await promise;

        expect(http.get).toHaveBeenCalledWith('/api/app_search/engines', {
          query: { type: 'indexed', pageIndex: 10 },
        });
        expect(EnginesLogic.actions.onEnginesLoad).toHaveBeenCalledWith({
          engines: [MOCK_ENGINE],
          total: 100,
        });
      });
    });

    describe('loadMetaEngines', () => {
      it('should call the engines API endpoint and set state based on the results', async () => {
        const promise = Promise.resolve(MOCK_ENGINES_API_RESPONSE);
        http.get.mockReturnValueOnce(promise);
        mount({ metaEnginesPage: 99 });
        jest.spyOn(EnginesLogic.actions, 'onMetaEnginesLoad');

        EnginesLogic.actions.loadMetaEngines();
        await promise;

        expect(http.get).toHaveBeenCalledWith('/api/app_search/engines', {
          query: { type: 'meta', pageIndex: 99 },
        });
        expect(EnginesLogic.actions.onMetaEnginesLoad).toHaveBeenCalledWith({
          engines: [MOCK_ENGINE],
          total: 100,
        });
      });
    });
  });
});
