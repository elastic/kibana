/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LogicMounter } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { Status } from '../../../../../common/types/api';
import { EnterpriseSearchEngineDetails } from '../../../../../common/types/engines';

import { FetchEngineApiLogic } from '../../api/engines/fetch_engine_api_logic';

import { EngineListFlyoutValues, EnginesListFlyoutLogic } from './engines_list_flyout_logic';

const DEFAULT_VALUES: EngineListFlyoutValues = {
  fetchEngineData: undefined,
  fetchEngineName: null,
  isFetchEngineFlyoutVisible: false,
  fetchEngineApiStatus: Status.IDLE,
  fetchEngineApiError: undefined,
  isFetchEngineLoading: false,
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
  name: 'my-test-engine',
  updated: '1999-12-31T23:59:59Z',
};

describe('EngineListFlyoutLogic', () => {
  const { mount } = new LogicMounter(EnginesListFlyoutLogic);
  const { mount: apiLogicMount } = new LogicMounter(FetchEngineApiLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    apiLogicMount();
    mount();
  });
  it('has expected default values', () => {
    expect(EnginesListFlyoutLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('closeFetchEngineIndicesFlyout', () => {
      it('set isFetchEngineFlyoutVisible to false and fetchEngineName to empty string', () => {
        EnginesListFlyoutLogic.actions.closeFetchIndicesFlyout();
        expect(EnginesListFlyoutLogic.values).toEqual(DEFAULT_VALUES);
      });
    });
    describe('openFetchEngineIndicesFlyout', () => {
      it('set isFetchEngineFlyoutVisible to true and sets fetchEngineName to engine name', () => {
        EnginesListFlyoutLogic.actions.openFetchEngineFlyout('my-test-engine');
        expect(EnginesListFlyoutLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isFetchEngineFlyoutVisible: true,
          fetchEngineName: 'my-test-engine',
          isFetchEngineLoading: true,
          fetchEngineApiStatus: Status.LOADING,
        });
      });
    });
  });

  describe('selectors', () => {
    it('receives fetchEngine indices data on success', () => {
      expect(EnginesListFlyoutLogic.values).toEqual(DEFAULT_VALUES);
      FetchEngineApiLogic.actions.apiSuccess(mockEngineData);
      expect(EnginesListFlyoutLogic.values).toEqual({
        ...DEFAULT_VALUES,
        fetchEngineApiStatus: Status.SUCCESS,
        fetchEngineData: mockEngineData,
      });
    });
  });
  describe('listeners', () => {
    beforeEach(() => {
      FetchEngineApiLogic.actions.apiSuccess(mockEngineData);
    });
    it('fetch engines flyout when flyout is visible', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      EnginesListFlyoutLogic.actions.openFetchEngineFlyout = jest.fn();
      EnginesListFlyoutLogic.actions.openFetchEngineFlyout('my-test-engine');
      await nextTick();
      expect(EnginesListFlyoutLogic.actions.openFetchEngineFlyout).toHaveBeenCalledTimes(1);
      expect(EnginesListFlyoutLogic.actions.openFetchEngineFlyout).toHaveBeenCalledWith(
        'my-test-engine'
      );
    });
  });
});
