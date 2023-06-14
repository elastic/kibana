/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LogicMounter } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { Status } from '../../../../../common/types/api';
import { EnterpriseSearchApplicationDetails } from '../../../../../common/types/search_applications';

import { FetchSearchApplicationApiLogic } from '../../api/search_applications/fetch_search_application_api_logic';

import {
  SearchApplicationIndicesFlyoutValues,
  SearchApplicationIndicesFlyoutLogic,
} from './search_application_indices_flyout_logic';

const DEFAULT_VALUES: SearchApplicationIndicesFlyoutValues = {
  fetchSearchApplicationApiError: undefined,
  fetchSearchApplicationApiStatus: Status.IDLE,
  isFlyoutVisible: false,
  isSearchApplicationLoading: false,
  searchApplicationData: undefined,
  searchApplicationName: null,
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
  name: 'my-test-engine',
  template: {
    script: {
      lang: 'mustache',
      params: { query_string: '*' },
      source: '',
    },
  },
  updated_at_millis: 1679337823167,
};

describe('EngineListFlyoutLogic', () => {
  const { mount } = new LogicMounter(SearchApplicationIndicesFlyoutLogic);
  const { mount: apiLogicMount } = new LogicMounter(FetchSearchApplicationApiLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    apiLogicMount();
    mount();
  });
  it('has expected default values', () => {
    expect(SearchApplicationIndicesFlyoutLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('closeFetchEngineIndicesFlyout', () => {
      it('set isFetchEngineFlyoutVisible to false and fetchEngineName to empty string', () => {
        SearchApplicationIndicesFlyoutLogic.actions.closeFlyout();
        expect(SearchApplicationIndicesFlyoutLogic.values).toEqual(DEFAULT_VALUES);
      });
    });
    describe('openFetchEngineIndicesFlyout', () => {
      it('set isFetchEngineFlyoutVisible to true and sets fetchEngineName to engine name', () => {
        SearchApplicationIndicesFlyoutLogic.actions.openFlyout('my-test-engine');
        expect(SearchApplicationIndicesFlyoutLogic.values).toEqual({
          ...DEFAULT_VALUES,
          fetchSearchApplicationApiStatus: Status.LOADING,
          isFlyoutVisible: true,
          isSearchApplicationLoading: true,
          searchApplicationName: 'my-test-engine',
        });
      });
    });
  });

  describe('selectors', () => {
    it('receives fetchEngine indices data on success', () => {
      expect(SearchApplicationIndicesFlyoutLogic.values).toEqual(DEFAULT_VALUES);
      FetchSearchApplicationApiLogic.actions.apiSuccess(mockEngineData);
      expect(SearchApplicationIndicesFlyoutLogic.values).toEqual({
        ...DEFAULT_VALUES,
        fetchSearchApplicationApiStatus: Status.SUCCESS,
        searchApplicationData: mockEngineData,
      });
    });
  });
  describe('listeners', () => {
    beforeEach(() => {
      FetchSearchApplicationApiLogic.actions.apiSuccess(mockEngineData);
    });
    it('fetch engines flyout when flyout is visible', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      SearchApplicationIndicesFlyoutLogic.actions.openFlyout = jest.fn();
      SearchApplicationIndicesFlyoutLogic.actions.openFlyout('my-test-engine');
      await nextTick();
      expect(SearchApplicationIndicesFlyoutLogic.actions.openFlyout).toHaveBeenCalledTimes(1);
      expect(SearchApplicationIndicesFlyoutLogic.actions.openFlyout).toHaveBeenCalledWith(
        'my-test-engine'
      );
    });
  });
});
