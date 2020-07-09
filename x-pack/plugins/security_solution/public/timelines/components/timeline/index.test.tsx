/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import { act } from 'react-dom/test-utils';
import useResizeObserver from 'use-resize-observer/polyfilled';

import {
  useSignalIndex,
  ReturnSignalIndex,
} from '../../../detections/containers/detection_engine/alerts/use_signal_index';
import { mocksSource } from '../../../common/containers/source/mock';
import { wait } from '../../../common/lib/helpers';
import { defaultHeaders, mockTimelineData, TestProviders } from '../../../common/mock';
import { Direction } from '../../../graphql/types';
import { timelineQuery } from '../../containers/index.gql_query';
import { timelineActions } from '../../store/timeline';

import { Sort } from './body/sort';
import { mockDataProviders } from './data_providers/mock/mock_data_providers';
import { StatefulTimeline, Props as StatefulTimelineProps } from './index';
import { Timeline } from './timeline';
import { TimelineType, TimelineStatus } from '../../../../common/types/timeline';

jest.mock('../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../common/lib/kibana');
  return {
    ...originalModule,
    useGetUserSavedObjectPermissions: jest.fn(),
  };
});

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));

const mockUseSignalIndex: jest.Mock = useSignalIndex as jest.Mock<ReturnSignalIndex>;
jest.mock('../../../detections/containers/detection_engine/alerts/use_signal_index');
jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: jest.fn(),
  };
});
jest.mock('../flyout/header_with_close_button');
describe('StatefulTimeline', () => {
  let props = {} as StatefulTimelineProps;
  const sort: Sort = {
    columnId: '@timestamp',
    sortDirection: Direction.desc,
  };
  const startDate = new Date('2018-03-23T18:49:23.132Z').valueOf();
  const endDate = new Date('2018-03-24T03:33:52.253Z').valueOf();

  const mocks = [
    { request: { query: timelineQuery }, result: { data: { events: mockTimelineData } } },
    ...mocksSource,
  ];

  beforeEach(() => {
    props = {
      addProvider: timelineActions.addProvider,
      columns: defaultHeaders,
      createTimeline: timelineActions.createTimeline,
      dataProviders: mockDataProviders,
      eventType: 'raw',
      end: endDate,
      filters: [],
      graphEventId: undefined,
      id: 'foo',
      isLive: false,
      isTimelineExists: false,
      itemsPerPage: 5,
      itemsPerPageOptions: [5, 10, 20],
      kqlMode: 'search',
      kqlQueryExpression: '',
      onClose: jest.fn(),
      onDataProviderEdited: timelineActions.dataProviderEdited,
      removeColumn: timelineActions.removeColumn,
      removeProvider: timelineActions.removeProvider,
      show: true,
      showCallOutUnauthorizedMsg: false,
      sort,
      start: startDate,
      status: TimelineStatus.active,
      timelineType: TimelineType.default,
      updateColumns: timelineActions.updateColumns,
      updateDataProviderEnabled: timelineActions.updateDataProviderEnabled,
      updateDataProviderExcluded: timelineActions.updateDataProviderExcluded,
      updateDataProviderKqlQuery: timelineActions.updateDataProviderKqlQuery,
      updateHighlightedDropAndProviderId: timelineActions.updateHighlightedDropAndProviderId,
      updateItemsPerPage: timelineActions.updateItemsPerPage,
      updateItemsPerPageOptions: timelineActions.updateItemsPerPageOptions,
      updateSort: timelineActions.updateSort,
      upsertColumn: timelineActions.upsertColumn,
      usersViewing: ['elastic'],
    };
  });

  describe('indexToAdd', () => {
    test('Make sure that indexToAdd return an unknown index if signalIndex does not exist', async () => {
      mockUseSignalIndex.mockImplementation(() => ({
        loading: false,
        signalIndexExists: false,
        signalIndexName: undefined,
      }));
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocks} addTypename={false}>
            <StatefulTimeline {...props} />
          </MockedProvider>
        </TestProviders>
      );
      await act(async () => {
        await wait();
        wrapper.update();
        const timeline = wrapper.find(Timeline);
        expect(timeline.props().indexToAdd).toEqual([
          'no-alert-index-049FC71A-4C2C-446F-9901-37XMC5024C51',
        ]);
      });
    });

    test('Make sure that indexToAdd return siem signal index if signalIndex exist', async () => {
      mockUseSignalIndex.mockImplementation(() => ({
        loading: false,
        signalIndexExists: true,
        signalIndexName: 'mock-siem-signals-index',
      }));
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocks} addTypename={false}>
            <StatefulTimeline {...props} />
          </MockedProvider>
        </TestProviders>
      );
      await act(async () => {
        await wait();
        wrapper.update();
        const timeline = wrapper.find(Timeline);
        expect(timeline.props().indexToAdd).toEqual(['mock-siem-signals-index']);
      });
    });
  });
});
