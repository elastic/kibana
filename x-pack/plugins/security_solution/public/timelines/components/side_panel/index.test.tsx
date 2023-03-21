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
import type { State } from '../../../common/store';
import { createStore } from '../../../common/store';
import { DetailsPanel } from '.';
import { TimelineId, TimelineTabs } from '../../../../common/types/timeline';
import { FlowTargetSourceDest } from '../../../../common/search_strategy/security_solution/network';
import { EventDetailsPanel } from './event_details';
import { useSearchStrategy } from '../../../common/containers/use_search_strategy';
import type { ExpandedDetailTimeline } from '../../../../common/types';

jest.mock('../../../common/containers/use_search_strategy', () => ({
  useSearchStrategy: jest.fn(),
}));

describe('Details Panel Component', () => {
  const state: State = {
    ...mockGlobalState,
    timeline: {
      ...mockGlobalState.timeline,
      timelineById: {
        ...mockGlobalState.timeline.timelineById,
        [TimelineId.test]: mockGlobalState.timeline.timelineById[TimelineId.test],
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

  const hostExpandedDetail: ExpandedDetailTimeline = {
    [TimelineTabs.query]: {
      panelView: 'hostDetail',
      params: {
        hostName: 'woohoo!',
      },
    },
  };

  const networkExpandedDetail: ExpandedDetailTimeline = {
    [TimelineTabs.query]: {
      panelView: 'networkDetail',
      params: {
        ip: 'woohoo!',
        flowTarget: FlowTargetSourceDest.source,
      },
    },
  };

  const eventExpandedDetail: ExpandedDetailTimeline = {
    [TimelineTabs.query]: {
      panelView: 'eventDetail',
      params: {
        eventId: 'my-id',
        indexName: 'my-index',
      },
    },
  };

  const eventPinnedExpandedDetail: ExpandedDetailTimeline = {
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
    handleOnPanelClosed: jest.fn(),
    isFlyoutView: false,
    runtimeMappings: {},
    tabType: TimelineTabs.query,
    scopeId: TimelineId.test,
  };

  const mockUseSearchStrategy = useSearchStrategy as jest.Mock;

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
      state.timeline.timelineById[TimelineId.test].expandedDetail =
        dataLessExpandedDetail as ExpandedDetailTimeline; // Casting as the dataless doesn't meet the actual type requirements
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('DetailsPanel')).toMatchSnapshot(`
        <DetailsPanel
          browserFields={Object {}}
          handleOnPanelClosed={[MockFunction]}
          isFlyoutView={false}
          runtimeMappings={Object {}}
          tabType="query"
          scopeId="timeline-test"
        />
      `);
    });
  });

  describe('DetailsPanel:EventDetails: rendering', () => {
    beforeEach(() => {
      const mockState = {
        ...state,
        timeline: {
          ...state.timeline,
          timelineById: {
            [TimelineId.test]: state.timeline.timelineById[TimelineId.test],
            [TimelineId.active]: state.timeline.timelineById[TimelineId.test],
          },
        },
      };
      mockState.timeline.timelineById[TimelineId.active].expandedDetail = eventExpandedDetail;
      mockState.timeline.timelineById[TimelineId.test].expandedDetail = eventExpandedDetail;
      store = createStore(mockState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

      mockUseSearchStrategy.mockReturnValue({
        loading: true,
        result: {
          data: undefined,
          totalCount: 0,
        },
        error: undefined,
        search: jest.fn(),
        refetch: jest.fn(),
        inspect: {},
      });
    });

    test('it should render the Event Details Panel when the panelView is set and the associated params are set', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('EventDetailsPanelComponent').render()).toMatchSnapshot();
    });

    test('it should render the Event Details view of the Details Panel in the flyout when the panelView is eventDetail and the eventId is set', () => {
      const currentProps = { ...mockProps, isFlyoutView: true };
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...currentProps} />
        </TestProviders>
      );
      expect(
        wrapper.find('[data-test-subj="timeline:details-panel:flyout"]').first().render()
      ).toMatchSnapshot();
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
      const currentProps = {
        ...mockProps,
        scopeId: TimelineId.active,
        tabType: TimelineTabs.query,
      };
      const newState = {
        ...state,
        timeline: {
          ...state.timeline,
          timelineById: {
            ...state.timeline.timelineById,
            [TimelineId.active]: state.timeline.timelineById[TimelineId.test],
          },
        },
      };
      newState.timeline.timelineById[TimelineId.active].activeTab = TimelineTabs.query;
      newState.timeline.timelineById[TimelineId.active].expandedDetail = eventExpandedDetail;
      store = createStore(newState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
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
      const mockState = {
        ...state,
        timeline: {
          ...state.timeline,
          timelineById: {
            [TimelineId.test]: state.timeline.timelineById[TimelineId.test],
            [TimelineId.active]: state.timeline.timelineById[TimelineId.test],
          },
        },
      };
      mockState.timeline.timelineById[TimelineId.active].activeTab = TimelineTabs.pinned;
      mockState.timeline.timelineById[TimelineId.active].expandedDetail = eventPinnedExpandedDetail;
      mockState.timeline.timelineById[TimelineId.test].expandedDetail = eventPinnedExpandedDetail;
      mockState.timeline.timelineById[TimelineId.test].activeTab = TimelineTabs.pinned;
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
        scopeId: TimelineId.active,
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
      mockUseSearchStrategy.mockReturnValue({
        loading: true,
        result: {
          hostDetails: {
            host: {},
          },
        },
        error: undefined,
        search: jest.fn(),
        refetch: jest.fn(),
        inspect: {},
      });
      const mockState = {
        ...state,
        timeline: {
          ...state.timeline,
          timelineById: {
            [TimelineId.test]: state.timeline.timelineById[TimelineId.test],
            [TimelineId.active]: state.timeline.timelineById[TimelineId.test],
          },
        },
      };
      mockState.timeline.timelineById[TimelineId.test].expandedDetail = hostExpandedDetail;
      mockState.timeline.timelineById[TimelineId.active].expandedDetail = hostExpandedDetail;
      store = createStore(mockState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    });

    afterEach(() => {
      mockUseSearchStrategy.mockReset();
    });

    test('it should render the Host Details view in the Details Panel when the panelView is hostDetail and the hostName is set', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('ExpandableHostDetails').first().render()).toMatchSnapshot();
    });
  });

  describe('DetailsPanel:NetworkDetails: rendering', () => {
    beforeEach(() => {
      mockUseSearchStrategy.mockReturnValue({
        loading: true,
        result: {
          networkDetails: {},
        },
        search: jest.fn(),
        refetch: jest.fn(),
        inspect: {},
      });
      const mockState = {
        ...state,
        timeline: {
          ...state.timeline,
          timelineById: {
            [TimelineId.test]: state.timeline.timelineById[TimelineId.test],
            [TimelineId.active]: state.timeline.timelineById[TimelineId.test],
          },
        },
      };
      mockState.timeline.timelineById[TimelineId.test].expandedDetail = networkExpandedDetail;
      mockState.timeline.timelineById[TimelineId.active].expandedDetail = networkExpandedDetail;
      store = createStore(mockState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    });

    afterEach(() => {
      mockUseSearchStrategy.mockReset();
    });

    test('it should render the Network Details view in the Details Panel when the panelView is networkDetail and the ip is set', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <DetailsPanel {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('ExpandableNetworkDetails').render()).toMatchSnapshot();
    });
  });
});
