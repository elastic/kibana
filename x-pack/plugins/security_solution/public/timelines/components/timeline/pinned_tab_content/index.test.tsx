/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import useResizeObserver from 'use-resize-observer/polyfilled';

import { DefaultCellRenderer } from '../cell_rendering/default_cell_renderer';
import { defaultHeaders, mockTimelineData } from '../../../../common/mock';
import '../../../../common/mock/match_media';
import { TestProviders } from '../../../../common/mock/test_providers';
import { defaultRowRenderers } from '../body/renderers';
import { Sort } from '../body/sort';
import { useMountAppended } from '../../../../common/utils/use_mount_appended';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import { useTimelineEvents } from '../../../containers/index';
import { useTimelineEventsDetails } from '../../../containers/details/index';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { mockSourcererScope } from '../../../../common/containers/sourcerer/mocks';
import { PinnedTabContentComponent, Props as PinnedTabContentComponentProps } from '.';
import { Direction } from '../../../../../common/search_strategy';
import { useDraggableKeyboardWrapper as mockUseDraggableKeyboardWrapper } from '../../../../../../timelines/public/components';
import { mockCasesContext } from '../../../../../../cases/public/mocks/mock_cases_context';

jest.mock('../../../containers/index', () => ({
  useTimelineEvents: jest.fn(),
}));
jest.mock('../../../containers/details/index', () => ({
  useTimelineEventsDetails: jest.fn(),
}));
jest.mock('../../fields_browser', () => ({
  useFieldBrowserOptions: jest.fn(),
}));
jest.mock('../body/events/index', () => ({
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
        cases: {
          ui: {
            getCasesContext: () => mockCasesContext,
          },
        },
        uiSettings: {
          get: jest.fn(),
        },
        savedObjects: {
          client: {},
        },
        timelines: {
          getLastUpdated: jest.fn(),
          getFieldBrowser: jest.fn(),
          getUseDraggableKeyboardWrapper: () => mockUseDraggableKeyboardWrapper,
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
      columnType: 'number',
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

    (useSourcererDataView as jest.Mock).mockReturnValue(mockSourcererScope);

    props = {
      columns: defaultHeaders,
      timelineId: TimelineId.test,
      itemsPerPage: 5,
      itemsPerPageOptions: [5, 10, 20],
      renderCellValue: DefaultCellRenderer,
      rowRenderers: defaultRowRenderers,
      sort,
      pinnedEventIds: {},
      showExpandedDetails: false,
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
