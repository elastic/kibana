/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import useResizeObserver from 'use-resize-observer/polyfilled';

import { Direction } from '../../../../graphql/types';
import { defaultHeaders, mockTimelineData } from '../../../../common/mock';
import '../../../../common/mock/match_media';
import { TestProviders } from '../../../../common/mock/test_providers';

import { QueryTabContentComponent, Props as QueryTabContentComponentProps } from './index';
import { Sort } from '../body/sort';
import { mockDataProviders } from '../data_providers/mock/mock_data_providers';
import { useMountAppended } from '../../../../common/utils/use_mount_appended';
import { TimelineId, TimelineStatus } from '../../../../../common/types/timeline';
import { useTimelineEvents } from '../../../containers/index';
import { useTimelineEventsDetails } from '../../../containers/details/index';
import { useSourcererScope } from '../../../../common/containers/sourcerer';
import { mockSourcererScope } from '../../../../common/containers/sourcerer/mocks';

jest.mock('../../../containers/index', () => ({
  useTimelineEvents: jest.fn(),
}));
jest.mock('../../../containers/details/index', () => ({
  useTimelineEventsDetails: jest.fn(),
}));
jest.mock('../body/events/index', () => ({
  // eslint-disable-next-line react/display-name
  Events: () => <></>,
}));

jest.mock('../../../../common/containers/sourcerer');

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));

jest.mock('../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: jest.fn().mockReturnValue({
      services: {
        application: {
          navigateToApp: jest.fn(),
          getUrlForApp: jest.fn(),
        },
        uiSettings: {
          get: jest.fn(),
        },
        savedObjects: {
          client: {},
        },
      },
    }),
    useGetUserSavedObjectPermissions: jest.fn(),
  };
});

describe('Timeline', () => {
  let props = {} as QueryTabContentComponentProps;
  const sort: Sort[] = [
    {
      columnId: '@timestamp',
      sortDirection: Direction.desc,
    },
  ];
  const startDate = '2018-03-23T18:49:23.132Z';
  const endDate = '2018-03-24T03:33:52.253Z';

  const mount = useMountAppended();

  beforeEach(() => {
    (useTimelineEvents as jest.Mock).mockReturnValue([
      false,
      {
        events: mockTimelineData,
        pageInfo: {
          activePage: 0,
          totalPages: 10,
        },
      },
    ]);
    (useTimelineEventsDetails as jest.Mock).mockReturnValue([false, {}]);

    (useSourcererScope as jest.Mock).mockReturnValue(mockSourcererScope);

    props = {
      columns: defaultHeaders,
      dataProviders: mockDataProviders,
      end: endDate,
      eventType: 'all',
      showEventDetails: false,
      filters: [],
      timelineId: TimelineId.test,
      isLive: false,
      itemsPerPage: 5,
      itemsPerPageOptions: [5, 10, 20],
      kqlMode: 'search' as QueryTabContentComponentProps['kqlMode'],
      kqlQueryExpression: '',
      showCallOutUnauthorizedMsg: false,
      sort,
      start: startDate,
      status: TimelineStatus.active,
      timerangeKind: 'absolute',
      updateEventTypeAndIndexesName: jest.fn(),
    };
  });

  describe('rendering', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          <QueryTabContentComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('QueryTabContentComponent')).toMatchSnapshot();
    });

    test('it renders the timeline header', () => {
      const wrapper = mount(
        <TestProviders>
          <QueryTabContentComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timelineHeader"]').exists()).toEqual(true);
    });

    test('it renders the timeline table', () => {
      const wrapper = mount(
        <TestProviders>
          <QueryTabContentComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="events-table"]').exists()).toEqual(true);
    });

    test('it does NOT render the timeline table when the source is loading', () => {
      (useSourcererScope as jest.Mock).mockReturnValue({
        browserFields: {},
        docValueFields: [],
        loading: true,
        indexPattern: {},
        selectedPatterns: [],
      });
      const wrapper = mount(
        <TestProviders>
          <QueryTabContentComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="events-table"]').exists()).toEqual(false);
    });

    test('it does NOT render the timeline table when start is empty', () => {
      const wrapper = mount(
        <TestProviders>
          <QueryTabContentComponent {...props} start={''} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="events-table"]').exists()).toEqual(false);
    });

    test('it does NOT render the timeline table when end is empty', () => {
      const wrapper = mount(
        <TestProviders>
          <QueryTabContentComponent {...props} end={''} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="events-table"]').exists()).toEqual(false);
    });

    test('it does NOT render the paging footer when you do NOT have any data providers', () => {
      const wrapper = mount(
        <TestProviders>
          <QueryTabContentComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="table-pagination"]').exists()).toEqual(false);
    });

    it('it shows the timeline footer', () => {
      const wrapper = mount(
        <TestProviders>
          <QueryTabContentComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timeline-footer"]').exists()).toEqual(true);
    });
  });
});
