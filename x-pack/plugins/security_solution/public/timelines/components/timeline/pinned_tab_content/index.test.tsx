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

import { Sort } from '../body/sort';
import { useMountAppended } from '../../../../common/utils/use_mount_appended';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import { useTimelineEvents } from '../../../containers/index';
import { useTimelineEventsDetails } from '../../../containers/details/index';
import { useSourcererScope } from '../../../../common/containers/sourcerer';
import { mockSourcererScope } from '../../../../common/containers/sourcerer/mocks';
import { PinnedTabContentComponent, Props as PinnedTabContentComponentProps } from '.';

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

describe('PinnedTabContent', () => {
  let props = {} as PinnedTabContentComponentProps;
  const sort: Sort[] = [
    {
      columnId: '@timestamp',
      sortDirection: Direction.desc,
    },
  ];

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
      timelineId: TimelineId.test,
      itemsPerPage: 5,
      itemsPerPageOptions: [5, 10, 20],
      sort,
      pinnedEventIds: {},
      showEventDetails: false,
      onEventClosed: jest.fn(),
    };
  });

  describe('rendering', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          <PinnedTabContentComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('PinnedTabContentComponent')).toMatchSnapshot();
    });

    test('it renders the timeline table', () => {
      const wrapper = mount(
        <TestProviders>
          <PinnedTabContentComponent {...props} />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="${TimelineTabs.pinned}-events-table"]`).exists()
      ).toEqual(true);
    });

    it('it shows the timeline footer', () => {
      const wrapper = mount(
        <TestProviders>
          <PinnedTabContentComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timeline-footer"]').exists()).toEqual(true);
    });
  });
});
