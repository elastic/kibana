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
import { DetailsPanel } from '.';
import {
  TimelineExpandedDetail,
  TimelineId,
  TimelineTabs,
} from '../../../../common/types/timeline';
import { FlowTarget } from '../../../../common/search_strategy/security_solution/network';
import { EventDetailsPanel } from './event_details';
import { useKibana } from '../../../common/lib/kibana';
import { mockCasesContext } from '@kbn/cases-plugin/public/mocks/mock_cases_context';

jest.mock('../../../common/lib/kibana');

describe('Details Panel Component', () => {
  const state: State = {
    ...mockGlobalState,
    timeline: {
      ...mockGlobalState.timeline,
      timelineById: {
        ...mockGlobalState.timeline.timelineById,
        [TimelineId.active]: mockGlobalState.timeline.timelineById.test,
      },
    },
  };

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

  const eventPinnedExpandedDetail: TimelineExpandedDetail = {
    [TimelineTabs.pinned]: {
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
    runtimeMappings: {},
    tabType: TimelineTabs.query,
    timelineId: 'test',
  };

  const mockSearchStrategy = jest.fn();

  describe('DetailsPanel: rendering', () => {
    beforeEach(() => {
      store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          data: {
            search: {
              searchStrategyClient: jest.fn(),
              search: mockSearchStrategy.mockReturnValue({
                unsubscribe: jest.fn(),
                subscribe: jest.fn(),
              }),
            },
            query: jest.fn(),
          },
          uiSettings: {
            get: jest.fn().mockReturnValue([]),
          },
          application: {
            navigateToApp: jest.fn(),
          },
          cases: {
            ui: { getCasesContext: () => mockCasesContext },
          },
        },
      });
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
      state.timeline.timelineById.test.expandedDetail =
        dataLessExpandedDetail as TimelineExpandedDetail; // Casting as the dataless doesn't meet the actual type requirements
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('DetailsPanel')).toMatchSnapshot(`
        <DetailsPanel
          browserFields={Object {}}
          docValueFields={Array []}
          handleOnPanelClosed={[MockFunction]}
          isFlyoutView={false}
          runtimeMappings={Object {}}
          tabType="query"
          timelineId="test"
        />
      `);
    });
  });

  describe('DetailsPanel:EventDetails: rendering', () => {
    beforeEach(() => {
      const mockState = { ...state };
      mockState.timeline.timelineById[TimelineId.active].expandedDetail = eventExpandedDetail;
      mockState.timeline.timelineById.test.expandedDetail = eventExpandedDetail;
      store = createStore(mockState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    });

    test('it should render the Event Details Panel when the panelView is set and the associated params are set', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('EventDetailsPanelComponent')).toMatchSnapshot();
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

    test('it should have the attributes isDraggable to be false when timelineId !== "active" and activeTab === "query"', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );
      expect(wrapper.find(EventDetailsPanel).props().isDraggable).toBeFalsy();
    });

    test('it should have the attributes isDraggable to be true when timelineId === "active" and activeTab === "query"', () => {
      const currentProps = { ...mockProps, timelineId: TimelineId.active };
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...currentProps} />
        </TestProviders>
      );
      expect(wrapper.find(EventDetailsPanel).props().isDraggable).toBeTruthy();
    });
  });

  describe('DetailsPanel:EventDetails: rendering in pinned tab', () => {
    beforeEach(() => {
      const mockState = { ...state };
      mockState.timeline.timelineById[TimelineId.active].activeTab = TimelineTabs.pinned;
      mockState.timeline.timelineById[TimelineId.active].expandedDetail = eventPinnedExpandedDetail;
      mockState.timeline.timelineById.test.expandedDetail = eventPinnedExpandedDetail;
      mockState.timeline.timelineById.test.activeTab = TimelineTabs.pinned;
      store = createStore(mockState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    });

    test('it should have the attributes isDraggable to be false when timelineId !== "active" and activeTab === "pinned"', () => {
      const currentProps = { ...mockProps, tabType: TimelineTabs.pinned };
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...currentProps} />
        </TestProviders>
      );
      expect(wrapper.find(EventDetailsPanel).props().isDraggable).toBeFalsy();
    });

    test('it should have the attributes isDraggable to be false when timelineId === "active" and activeTab === "pinned"', () => {
      const currentProps = {
        ...mockProps,
        tabType: TimelineTabs.pinned,
        timelineId: TimelineId.active,
      };
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...currentProps} />
        </TestProviders>
      );
      expect(wrapper.find(EventDetailsPanel).props().isDraggable).toBeFalsy();
    });
  });

  describe('DetailsPanel:HostDetails: rendering', () => {
    beforeEach(() => {
      const mockState = { ...state };
      mockState.timeline.timelineById[TimelineId.active].expandedDetail = hostExpandedDetail;
      mockState.timeline.timelineById.test.expandedDetail = hostExpandedDetail;
      store = createStore(mockState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    });

    test('it should render the Host Details view in the Details Panel when the panelView is hostDetail and the hostName is set', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('ExpandableHostDetails')).toMatchSnapshot();
    });
  });

  describe('DetailsPanel:NetworkDetails: rendering', () => {
    beforeEach(() => {
      const mockState = { ...state };
      mockState.timeline.timelineById[TimelineId.active].expandedDetail = networkExpandedDetail;
      mockState.timeline.timelineById.test.expandedDetail = networkExpandedDetail;
      store = createStore(mockState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    });

    test('it should render the Network Details view in the Details Panel when the panelView is networkDetail and the ip is set', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('ExpandableNetworkDetails')).toMatchSnapshot();
    });
  });
});
