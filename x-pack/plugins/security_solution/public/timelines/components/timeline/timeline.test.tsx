/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import useResizeObserver from 'use-resize-observer/polyfilled';

import { mockBrowserFields } from '../../../common/containers/source/mock';
import { Direction } from '../../../graphql/types';
import {
  defaultHeaders,
  mockTimelineData,
  mockIndexPattern,
  mockIndexNames,
} from '../../../common/mock';
import '../../../common/mock/match_media';
import { TestProviders } from '../../../common/mock/test_providers';

import { TimelineComponent, Props as TimelineComponentProps } from './timeline';
import { Sort } from './body/sort';
import { mockDataProviders } from './data_providers/mock/mock_data_providers';
import { useMountAppended } from '../../../common/utils/use_mount_appended';
import { TimelineId, TimelineStatus, TimelineType } from '../../../../common/types/timeline';
import { useTimelineEvents } from '../../containers/index';
import { useTimelineEventsDetails } from '../../containers/details/index';

jest.mock('../../containers/index', () => ({
  useTimelineEvents: jest.fn(),
}));
jest.mock('../../containers/details/index', () => ({
  useTimelineEventsDetails: jest.fn(),
}));
jest.mock('./body/events/index', () => ({
  // eslint-disable-next-line react/display-name
  Events: () => <></>,
}));
jest.mock('../../../common/lib/kibana');
jest.mock('./properties/properties_right');
const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');

mockUseResizeObserver.mockImplementation(() => ({}));

jest.mock('../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../common/lib/kibana');
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
  let props = {} as TimelineComponentProps;
  const sort: Sort = {
    columnId: '@timestamp',
    sortDirection: Direction.desc,
  };
  const startDate = '2018-03-23T18:49:23.132Z';
  const endDate = '2018-03-24T03:33:52.253Z';

  const indexPattern = mockIndexPattern;

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

    props = {
      browserFields: mockBrowserFields,
      columns: defaultHeaders,
      dataProviders: mockDataProviders,
      docValueFields: [],
      end: endDate,
      filters: [],
      id: TimelineId.test,
      indexNames: mockIndexNames,
      indexPattern,
      isLive: false,
      isSaving: false,
      itemsPerPage: 5,
      itemsPerPageOptions: [5, 10, 20],
      kqlMode: 'search' as TimelineComponentProps['kqlMode'],
      kqlQueryExpression: '',
      loadingSourcerer: false,
      onChangeItemsPerPage: jest.fn(),
      onClose: jest.fn(),
      show: true,
      showCallOutUnauthorizedMsg: false,
      sort,
      start: startDate,
      status: TimelineStatus.active,
      timelineType: TimelineType.default,
      toggleColumn: jest.fn(),
      usersViewing: ['elastic'],
    };
  });

  describe('rendering', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          <TimelineComponent {...props} />
        </TestProviders>
      );

      expect(wrapper).toMatchSnapshot();
    });

    test('it renders the timeline header', () => {
      const wrapper = mount(
        <TestProviders>
          <TimelineComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timelineHeader"]').exists()).toEqual(true);
    });

    test('it renders the title field', () => {
      const wrapper = mount(
        <TestProviders>
          <TimelineComponent {...props} />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="timeline-title"]').first().props().placeholder
      ).toContain('Untitled timeline');
    });

    test('it renders the timeline table', () => {
      const wrapper = mount(
        <TestProviders>
          <TimelineComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="events-table"]').exists()).toEqual(true);
    });

    test('it does NOT render the timeline table when the source is loading', () => {
      const wrapper = mount(
        <TestProviders>
          <TimelineComponent {...props} loadingSourcerer={true} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="events-table"]').exists()).toEqual(false);
    });

    test('it does NOT render the timeline table when start is empty', () => {
      const wrapper = mount(
        <TestProviders>
          <TimelineComponent {...props} start={''} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="events-table"]').exists()).toEqual(false);
    });

    test('it does NOT render the timeline table when end is empty', () => {
      const wrapper = mount(
        <TestProviders>
          <TimelineComponent {...props} end={''} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="events-table"]').exists()).toEqual(false);
    });

    test('it does NOT render the paging footer when you do NOT have any data providers', () => {
      const wrapper = mount(
        <TestProviders>
          <TimelineComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="table-pagination"]').exists()).toEqual(false);
    });

    it('it shows the timeline footer', () => {
      const wrapper = mount(
        <TestProviders>
          <TimelineComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timeline-footer"]').exists()).toEqual(true);
    });
    describe('when there is a graphEventId', () => {
      beforeEach(() => {
        props.graphEventId = 'graphEventId'; // any string w/ length > 0 works
      });
      it('should not show the timeline footer', () => {
        const wrapper = mount(
          <TestProviders>
            <TimelineComponent {...props} />
          </TestProviders>
        );

        expect(wrapper.find('[data-test-subj="timeline-footer"]').exists()).toEqual(false);
      });
    });
  });
});
