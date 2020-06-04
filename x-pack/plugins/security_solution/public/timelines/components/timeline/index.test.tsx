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

import { StatefulTimeline, Props as StatefulTimelineProps } from './index';

import { Direction } from '../../graphql/types';
import { defaultHeaders, mockTimelineData, TestProviders } from '../../mock';
import { timelineActions } from '../../store/timeline';

import { Sort } from './body/sort';
import { mockDataProviders } from './data_providers/mock/mock_data_providers';
import { timelineQuery } from '../../containers/timeline/index.gql_query';
import { mocksSource } from '../../containers/source/mock';
import { Timeline } from './timeline';
import { wait } from '../../lib/helpers';
import {
  useSignalIndex,
  ReturnSignalIndex,
} from '../../containers/detection_engine/signals/use_signal_index';

jest.mock('../../lib/kibana');

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));

const mockUseSignalIndex: jest.Mock = useSignalIndex as jest.Mock<ReturnSignalIndex>;
jest.mock('../../containers/detection_engine/signals/use_signal_index');

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
      id: 'foo',
      isLive: false,
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
          'unknown-049FC71A-4C2C-446F-9901-3770C5024C51-index',
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
