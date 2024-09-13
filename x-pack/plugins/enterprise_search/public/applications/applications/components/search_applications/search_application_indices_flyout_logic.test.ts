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
const mockSearchApplicationData: EnterpriseSearchApplicationDetails = {
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
  name: 'my-test-search-application',
  template: {
    script: {
      lang: 'mustache',
      params: { query_string: '*' },
      options: { content_type: 'application/json;charset=utf-8' },
      source: '',
    },
  },
  updated_at_millis: 1679337823167,
};

describe('SearchApplicationIndicesFlyoutLogic', () => {
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
    describe('closeFlyout', () => {
      it('set isFlyoutVisible to false and searchApplicationName is null', () => {
        SearchApplicationIndicesFlyoutLogic.actions.closeFlyout();
        expect(SearchApplicationIndicesFlyoutLogic.values).toEqual(DEFAULT_VALUES);
      });
    });
    describe('openFlyout', () => {
      it('set isFlyoutVisible to true and sets searchApplicationName to search application name', () => {
        SearchApplicationIndicesFlyoutLogic.actions.openFlyout('my-test-search-application');
        expect(SearchApplicationIndicesFlyoutLogic.values).toEqual({
          ...DEFAULT_VALUES,
          fetchSearchApplicationApiStatus: Status.LOADING,
          isFlyoutVisible: true,
          isSearchApplicationLoading: true,
          searchApplicationName: 'my-test-search-application',
        });
      });
    });
  });

  describe('selectors', () => {
    it('receives fetchSearchApplication indices data on success', () => {
      expect(SearchApplicationIndicesFlyoutLogic.values).toEqual(DEFAULT_VALUES);
      FetchSearchApplicationApiLogic.actions.apiSuccess(mockSearchApplicationData);
      expect(SearchApplicationIndicesFlyoutLogic.values).toEqual({
        ...DEFAULT_VALUES,
        fetchSearchApplicationApiStatus: Status.SUCCESS,
        searchApplicationData: mockSearchApplicationData,
      });
    });
  });
  describe('listeners', () => {
    beforeEach(() => {
      FetchSearchApplicationApiLogic.actions.apiSuccess(mockSearchApplicationData);
    });
    it('fetch search applications flyout when flyout is visible', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      SearchApplicationIndicesFlyoutLogic.actions.openFlyout = jest.fn();
      SearchApplicationIndicesFlyoutLogic.actions.openFlyout('my-test-search-application');
      await nextTick();
      expect(SearchApplicationIndicesFlyoutLogic.actions.openFlyout).toHaveBeenCalledTimes(1);
      expect(SearchApplicationIndicesFlyoutLogic.actions.openFlyout).toHaveBeenCalledWith(
        'my-test-search-application'
      );
    });
  });
});
