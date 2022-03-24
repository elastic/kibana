/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import { getOr } from 'lodash/fp';
import React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';

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
import { networkModel } from '../../store';
import { TlsTable } from '.';
import { mockTlsData } from './mock';

jest.mock('../../../common/lib/kibana');

describe('Tls Table Component', () => {
  const loadPage = jest.fn();
  const state: State = mockGlobalState;
  const defaultProps = {
    data: mockTlsData.edges,
    fakeTotalCount: getOr(50, 'fakeTotalCount', mockTlsData.pageInfo),
    id: 'tls',
    isInspect: false,
    loading: false,
    loadPage,
    setQuerySkip: jest.fn(),
    showMorePagesIndicator: getOr(false, 'showMorePagesIndicator', mockTlsData.pageInfo),
    totalCount: 1,
    type: networkModel.NetworkType.details,
  };
  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  const mount = useMountAppended();

  beforeEach(() => {
    store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  describe('Rendering', () => {
    test('it renders the default Domains table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <TlsTable {...defaultProps} />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('Connect(TlsTableComponent)')).toMatchSnapshot();
    });
  });

  describe('Sorting on Table', () => {
    test('when you click on the column header, you should show the sorting icon', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <TlsTable {...defaultProps} />
        </TestProviders>
      );
      expect(store.getState().network.details.queries?.tls.sort).toEqual({
        direction: 'desc',
        field: '_id',
      });

      wrapper.find('.euiTable thead tr th button').first().simulate('click');

      wrapper.update();

      expect(store.getState().network.details.queries?.tls.sort).toEqual({
        direction: 'asc',
        field: '_id',
      });

      expect(wrapper.find('.euiTable thead tr th button').first().text()).toEqual(
        'SHA1 fingerprint'
      );
    });
  });
});
