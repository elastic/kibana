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
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../../common/mock';

import { OverviewHost } from '.';
import { createStore, State } from '../../../common/store';
import { useHostOverview } from '../../containers/overview_host';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import { render } from '@testing-library/react';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/components/link_to');
jest.mock('../../../common/containers/query_toggle');

const startDate = '2020-01-20T20:49:57.080Z';
const endDate = '2020-01-21T20:49:57.080Z';
const testProps = {
  endDate,
  indexNames: [],
  setQuery: jest.fn(),
  startDate,
  filterQuery: '',
};
const MOCKED_RESPONSE = {
  overviewHost: {
    auditbeatAuditd: 1,
    auditbeatFIM: 1,
    auditbeatLogin: 1,
    auditbeatPackage: 1,
    auditbeatProcess: 1,
    auditbeatUser: 1,
    endgameDns: 1,
    endgameFile: 1,
    endgameImageLoad: 1,
    endgameNetwork: 1,
    endgameProcess: 1,
    endgameRegistry: 1,
    endgameSecurity: 1,
    filebeatSystemModule: 1,
    winlogbeatSecurity: 1,
    winlogbeatMWSysmonOperational: 1,
  },
};

jest.mock('../../containers/overview_host');
const useHostOverviewMock = useHostOverview as jest.Mock;
const mockUseQueryToggle = useQueryToggle as jest.Mock;

describe('OverviewHost', () => {
  const state: State = mockGlobalState;

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });
    const myState = cloneDeep(state);
    useHostOverviewMock.mockReturnValue([false, MOCKED_RESPONSE]);
    store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  test('it renders the expected widget title', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <OverviewHost {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-title"]').first().text()).toEqual(
      'Host events'
    );
  });

  test('it renders an empty subtitle while loading', () => {
    useHostOverviewMock.mockReturnValueOnce([true, { overviewHost: {} }]);
    const wrapper = mount(
      <TestProviders store={store}>
        <OverviewHost {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-panel-subtitle"]').first().text()).toEqual('');
  });

  test('it renders the expected event count in the subtitle after loading events', async () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <OverviewHost {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-panel-subtitle"]').first().text()).toEqual(
      'Showing: 16 events'
    );
  });

  test('toggleStatus=true, do not skip', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <OverviewHost {...testProps} />
      </TestProviders>
    );
    expect(useHostOverviewMock.mock.calls[0][0].skip).toEqual(false);
    expect(queryByTestId('overview-hosts-stats')).toBeInTheDocument();
  });
  test('toggleStatus=false, skip', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
    const { queryByTestId } = render(
      <TestProviders>
        <OverviewHost {...testProps} />
      </TestProviders>
    );
    expect(useHostOverviewMock.mock.calls[0][0].skip).toEqual(true);
    expect(queryByTestId('overview-hosts-stats')).not.toBeInTheDocument();
  });
});
