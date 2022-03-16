/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockHttpValues } from '../../../__mocks__/kea_logic';

jest.mock('../engine', () => ({
  EngineLogic: { values: { engineName: 'some-engine' } },
}));

import { nextTick } from '@kbn/test-jest-helpers';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';

import { EngineOverviewLogic } from './';

describe('EngineOverviewLogic', () => {
  const { mount } = new LogicMounter(EngineOverviewLogic);
  const { http } = mockHttpValues;

  const mockEngineMetrics = {
    documentCount: 10,
    startDate: '1970-01-30',
    operationsPerDay: [0, 0, 0, 0, 0, 0, 0],
    queriesPerDay: [0, 0, 0, 0, 0, 25, 50],
    totalClicks: 50,
    totalQueries: 75,
  };

  const DEFAULT_VALUES = {
    dataLoading: true,
    documentCount: 0,
    startDate: '',
    operationsPerDay: [],
    queriesPerDay: [],
    totalClicks: 0,
    totalQueries: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(EngineOverviewLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onOverviewMetricsLoad', () => {
      it('should set all received data as top-level values and set dataLoading to false', () => {
        mount();
        EngineOverviewLogic.actions.onOverviewMetricsLoad(mockEngineMetrics);

        expect(EngineOverviewLogic.values).toEqual({
          ...DEFAULT_VALUES,
          ...mockEngineMetrics,
          dataLoading: false,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('loadOverviewMetrics', () => {
      it('fetches data and calls onOverviewMetricsLoad', async () => {
        mount();
        jest.spyOn(EngineOverviewLogic.actions, 'onOverviewMetricsLoad');
        http.get.mockReturnValueOnce(Promise.resolve(mockEngineMetrics));

        EngineOverviewLogic.actions.loadOverviewMetrics();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith('/internal/app_search/engines/some-engine/overview');
        expect(EngineOverviewLogic.actions.onOverviewMetricsLoad).toHaveBeenCalledWith(
          mockEngineMetrics
        );
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        EngineOverviewLogic.actions.loadOverviewMetrics();
      });
    });
  });
});
