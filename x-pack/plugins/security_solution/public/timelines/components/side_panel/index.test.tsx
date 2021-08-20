/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { createStore, State } from '../../../common/store';
import { DetailsPanel } from './index';
import { TimelineExpandedDetail, TimelineTabs } from '../../../../common/types/timeline';
import { FlowTarget } from '../../../../common/search_strategy/security_solution/network';

jest.mock('../../../common/lib/kibana');

jest.mock('@kbn/alerts', () => ({
  useGetUserAlertsPermissions: () => ({
    loading: false,
    crud: true,
    read: true,
  }),
}));

describe('Details Panel Component', () => {
  const state: State = { ...mockGlobalState };

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  const dataLessExpandedDetail = {
    [TimelineTabs.query]: {
      panelView: 'hostDetail',
      params: {},
    },
  };

  const hostExpandedDetail: TimelineExpandedDetail = {
    [TimelineTabs.query]: {
      panelView: 'hostDetail',
      params: {
        hostName: 'woohoo!',
      },
    },
  };

  const networkExpandedDetail: TimelineExpandedDetail = {
    [TimelineTabs.query]: {
      panelView: 'networkDetail',
      params: {
        ip: 'woohoo!',
        flowTarget: FlowTarget.source,
      },
    },
  };

  const eventExpandedDetail: TimelineExpandedDetail = {
    [TimelineTabs.query]: {
      panelView: 'eventDetail',
      params: {
        eventId: 'my-id',
        indexName: 'my-index',
      },
    },
  };

  const mockProps = {
    browserFields: {},
    docValueFields: [],
    handleOnPanelClosed: jest.fn(),
    isFlyoutView: false,
    tabType: TimelineTabs.query,
    timelineId: 'test',
  };

  describe('DetailsPanel: rendering', () => {
    beforeEach(() => {
      store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    });

    test('it should not render the DetailsPanel if no expanded detail has been set in the reducer', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('DetailsPanel')).toMatchSnapshot();
    });

    test('it should not render the DetailsPanel if an expanded detail with a panelView, but not params have been set', () => {
      state.timeline.timelineById.test.expandedDetail = dataLessExpandedDetail as TimelineExpandedDetail; // Casting as the dataless doesn't meet the actual type requirements
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('DetailsPanel')).toMatchSnapshot();
    });
  });

  describe('DetailsPanel:EventDetails: rendering', () => {
    beforeEach(() => {
      state.timeline.timelineById.test.expandedDetail = eventExpandedDetail;
      store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    });

    test('it should render the Details Panel when the panelView is set and the associated params are set', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('DetailsPanel')).toMatchSnapshot();
    });

    test('it should render the Event Details view of the Details Panel in the flyout when the panelView is eventDetail and the eventId is set', () => {
      const currentProps = { ...mockProps, isFlyoutView: true };
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...currentProps} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timeline:details-panel:flyout"]')).toMatchSnapshot();
    });

    test('it should render the Event Details view in the Details Panel when the panelView is eventDetail and the eventId is set', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('EventDetails')).toMatchSnapshot();
    });
  });

  describe('DetailsPanel:HostDetails: rendering', () => {
    beforeEach(() => {
      state.timeline.timelineById.test.expandedDetail = hostExpandedDetail;
      store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    });

    test('it should render the Host Details view in the Details Panel when the panelView is hostDetail and the hostName is set', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('HostDetails')).toMatchSnapshot();
    });
  });

  describe('DetailsPanel:NetworkDetails: rendering', () => {
    beforeEach(() => {
      state.timeline.timelineById.test.expandedDetail = networkExpandedDetail;
      store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    });

    test('it should render the Network Details view in the Details Panel when the panelView is networkDetail and the ip is set', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('NetworkDetails')).toMatchSnapshot();
    });
  });
});
