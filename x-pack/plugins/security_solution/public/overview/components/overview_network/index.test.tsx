/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash/fp';
import { mount } from 'enzyme';
import React from 'react';

import '../../../common/mock/match_media';
import {
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
  createSecuritySolutionStorageMock,
  kibanaObservable,
} from '../../../common/mock';
import { OverviewNetwork } from '.';
import type { State } from '../../../common/store';
import { createStore } from '../../../common/store';
import { useNetworkOverview } from '../../containers/overview_network';
import { SecurityPageName } from '../../../app/types';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import { render } from '@testing-library/react';

jest.mock('../../../common/components/link_to');
const mockNavigateToApp = jest.fn();
jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
          getUrlForApp: jest.fn(),
        },
      },
    }),
    useUiSetting$: jest.fn().mockReturnValue([]),
    useGetUserSavedObjectPermissions: jest.fn(),
  };
});

const startDate = '2020-01-20T20:49:57.080Z';
const endDate = '2020-01-21T20:49:57.080Z';
const defaultProps = {
  endDate,
  filterQuery: '',
  startDate,
  setQuery: jest.fn(),
  indexNames: [],
};

const MOCKED_RESPONSE = {
  overviewNetwork: {
    auditbeatSocket: 1,
    filebeatCisco: 1,
    filebeatNetflow: 1,
    filebeatPanw: 1,
    filebeatSuricata: 1,
    filebeatZeek: 1,
    packetbeatDNS: 1,
    packetbeatFlow: 1,
    packetbeatTLS: 1,
  },
};

jest.mock('../../../common/containers/query_toggle');
jest.mock('../../containers/overview_network');
const useNetworkOverviewMock = useNetworkOverview as jest.Mock;
const mockUseQueryToggle = useQueryToggle as jest.Mock;

describe('OverviewNetwork', () => {
  const state: State = mockGlobalState;

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    jest.clearAllMocks();
    useNetworkOverviewMock.mockReturnValue([false, MOCKED_RESPONSE]);
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });
    const myState = cloneDeep(state);
    store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  test('it renders the expected widget title', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <OverviewNetwork {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-title"]').first().text()).toEqual(
      'Network events'
    );
  });

  test('it renders an empty subtitle while loading', () => {
    useNetworkOverviewMock.mockReturnValueOnce([true, { overviewNetwork: {} }]);
    const wrapper = mount(
      <TestProviders store={store}>
        <OverviewNetwork {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-panel-subtitle"]').first().text()).toEqual('');
  });

  test('it renders the expected event count in the subtitle after loading events', async () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <OverviewNetwork {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-panel-subtitle"]').first().text()).toEqual(
      'Showing: 9 events'
    );
  });

  it('it renders View Network', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <OverviewNetwork {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="overview-network-go-to-network-page"]')).toBeTruthy();
  });

  it('when click on View Network we call navigateToApp to make sure to navigate to right page', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <OverviewNetwork {...defaultProps} />
      </TestProviders>
    );

    wrapper
      .find('[data-test-subj="overview-network-go-to-network-page"] button')
      .simulate('click', {
        preventDefault: jest.fn(),
      });

    expect(mockNavigateToApp).toBeCalledWith('securitySolutionUI', {
      path: '',
      deepLinkId: SecurityPageName.network,
    });
  });

  it('toggleStatus=true, do not skip', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <OverviewNetwork {...defaultProps} />
      </TestProviders>
    );
    expect(useNetworkOverviewMock.mock.calls[0][0].skip).toEqual(false);
    expect(queryByTestId('overview-network-stats')).toBeInTheDocument();
  });
  it('toggleStatus=false, skip', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
    const { queryByTestId } = render(
      <TestProviders>
        <OverviewNetwork {...defaultProps} />
      </TestProviders>
    );
    expect(useNetworkOverviewMock.mock.calls[0][0].skip).toEqual(true);
    expect(queryByTestId('overview-network-stats')).not.toBeInTheDocument();
  });
});
