/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import '../../../common/mock/match_media';
import {
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../../common/mock';
import { useMountAppended } from '../../../common/utils/use_mount_appended';
import { createStore, State } from '../../../common/store';
import { hostsModel } from '../../store';
import { HostsTableType } from '../../store/model';
import { HostsTable } from '.';
import { mockData } from './mock';
import { render } from '@testing-library/react';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

jest.mock('../../../common/lib/kibana');

jest.mock('../../../common/lib/kibana/hooks', () => ({
  useNavigateTo: () => ({
    navigateTo: jest.fn(),
  }),
}));

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../../common/components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../../common/components/query_bar', () => ({
  QueryBar: () => null,
}));

jest.mock('../../../common/components/link_to');

jest.mock('../../../common/hooks/use_experimental_features');

describe('Hosts Table', () => {
  const loadPage = jest.fn();
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();

  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  const mount = useMountAppended();

  beforeEach(() => {
    store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  describe('rendering', () => {
    test('it renders the default Hosts table', () => {
      const wrapper = shallow(
        <TestProviders store={store}>
          <HostsTable
            data={mockData}
            id="hostsQuery"
            isInspect={false}
            fakeTotalCount={0}
            loading={false}
            loadPage={loadPage}
            setQuerySkip={jest.fn()}
            showMorePagesIndicator={false}
            totalCount={-1}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(wrapper.find('HostsTable')).toMatchSnapshot();
    });

    test('it renders "Host Risk classfication" column when "riskyHostsEnabled" feature flag is enabled', () => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);

      const { queryByTestId } = render(
        <TestProviders store={store}>
          <HostsTable
            id="hostsQuery"
            isInspect={false}
            loading={false}
            data={mockData}
            totalCount={0}
            fakeTotalCount={-1}
            setQuerySkip={jest.fn()}
            showMorePagesIndicator={false}
            loadPage={loadPage}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(queryByTestId('tableHeaderCell_node.risk_4')).toBeInTheDocument();
    });

    test("it doesn't renders 'Host Risk classfication' column when 'riskyHostsEnabled' feature flag is disabled", () => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);

      const { queryByTestId } = render(
        <TestProviders store={store}>
          <HostsTable
            id="hostsQuery"
            isInspect={false}
            loading={false}
            data={mockData}
            totalCount={0}
            fakeTotalCount={-1}
            setQuerySkip={jest.fn()}
            showMorePagesIndicator={false}
            loadPage={loadPage}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(queryByTestId('tableHeaderCell_node.riskScore_4')).not.toBeInTheDocument();
    });

    describe('Sorting on Table', () => {
      let wrapper: ReturnType<typeof mount>;

      beforeEach(() => {
        wrapper = mount(
          <TestProviders store={store}>
            <HostsTable
              id="hostsQuery"
              isInspect={false}
              loading={false}
              data={mockData}
              totalCount={0}
              fakeTotalCount={-1}
              setQuerySkip={jest.fn()}
              showMorePagesIndicator={false}
              loadPage={loadPage}
              type={hostsModel.HostsType.page}
            />
          </TestProviders>
        );
      });
      test('Initial value of the store', () => {
        expect(store.getState().hosts.page.queries[HostsTableType.hosts]).toEqual({
          activePage: 0,
          direction: 'desc',
          sortField: 'lastSeen',
          limit: 10,
        });
        expect(wrapper.find('.euiTable thead tr th button').at(1).text()).toEqual('Last seen ');
        expect(wrapper.find('.euiTable thead tr th button').at(1).find('svg')).toBeTruthy();
      });

      test('when you click on the column header, you should show the sorting icon', () => {
        wrapper.find('.euiTable thead tr th button').first().simulate('click');

        wrapper.update();

        expect(store.getState().hosts.page.queries[HostsTableType.hosts]).toEqual({
          activePage: 0,
          direction: 'asc',
          sortField: 'hostName',
          limit: 10,
        });
        expect(wrapper.find('.euiTable thead tr th button').first().text()).toEqual('Host name');
      });
    });
  });
});
