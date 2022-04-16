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

import { QueryTabContentComponent, Props as QueryTabContentComponentProps } from '.';
import { defaultRowRenderers } from '../body/renderers';
import { Sort } from '../body/sort';
import { mockDataProviders } from '../data_providers/mock/mock_data_providers';
import { useMountAppended } from '../../../../common/utils/use_mount_appended';
import { TimelineId, TimelineStatus, TimelineTabs } from '../../../../../common/types/timeline';
import { useTimelineEvents } from '../../../containers';
import { useTimelineEventsDetails } from '../../../containers/details';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { mockSourcererScope } from '../../../../common/containers/sourcerer/mocks';
import { Direction } from '../../../../../common/search_strategy';
import * as helpers from '../helpers';
import { mockCasesContext } from '@kbn/cases-plugin/public/mocks/mock_cases_context';

jest.mock('../../../containers', () => ({
  useTimelineEvents: jest.fn(),
}));
jest.mock('../../../containers/details', () => ({
  useTimelineEventsDetails: jest.fn(),
}));
jest.mock('../../fields_browser', () => ({
  useFieldBrowserOptions: jest.fn(),
}));
jest.mock('../body/events', () => ({
  Events: () => <></>,
}));

jest.mock('../../../../common/containers/sourcerer');
jest.mock('../../../../common/containers/sourcerer/use_signal_helpers', () => ({
  useSignalHelpers: () => ({ signalIndexNeedsInit: false }),
}));

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));

jest.mock('../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: jest.fn().mockReturnValue({
      services: {
        theme: {
          theme$: {},
        },
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
          getLoadingPanel: jest.fn(),
          getFieldBrowser: jest.fn(),
          getUseDraggableKeyboardWrapper: () =>
            jest.fn().mockReturnValue({
              onBlur: jest.fn(),
              onKeyDown: jest.fn(),
            }),
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
      columnType: 'number',
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

    (useSourcererDataView as jest.Mock).mockReturnValue(mockSourcererScope);

    props = {
      columns: defaultHeaders,
      dataProviders: mockDataProviders,
      end: endDate,
      expandedDetail: {},
      filters: [],
      timelineId: TimelineId.test,
      isLive: false,
      itemsPerPage: 5,
      itemsPerPageOptions: [5, 10, 20],
      kqlMode: 'search' as QueryTabContentComponentProps['kqlMode'],
      kqlQueryExpression: ' ',
      onEventClosed: jest.fn(),
      renderCellValue: DefaultCellRenderer,
      rowRenderers: defaultRowRenderers,
      showCallOutUnauthorizedMsg: false,
      showExpandedDetails: false,
      sort,
      start: startDate,
      status: TimelineStatus.active,
      timerangeKind: 'absolute',
      activeTab: TimelineTabs.query,
      show: true,
    };
  });

  describe('rendering', () => {
    let spyCombineQueries: jest.SpyInstance;

    beforeEach(() => {
      spyCombineQueries = jest.spyOn(helpers, 'combineQueries');
    });
    afterEach(() => {
      spyCombineQueries.mockClear();
    });

    test('should trim kqlQueryExpression', () => {
      mount(
        <TestProviders>
          <QueryTabContentComponent {...props} />
        </TestProviders>
      );

      expect(spyCombineQueries.mock.calls[0][0].kqlQuery.query).toEqual(
        props.kqlQueryExpression.trim()
      );
    });

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

      expect(
        wrapper.find(`[data-test-subj="${TimelineTabs.query}-events-table"]`).exists()
      ).toEqual(true);
    });

    test('it does render the timeline table when the source is loading with no events', () => {
      (useSourcererDataView as jest.Mock).mockReturnValue({
        browserFields: {},
        docValueFields: [],
        loading: true,
        indexPattern: {},
        selectedPatterns: [],
        missingPatterns: [],
      });
      const wrapper = mount(
        <TestProviders>
          <QueryTabContentComponent {...props} />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="${TimelineTabs.query}-events-table"]`).exists()
      ).toEqual(true);
      expect(wrapper.find('[data-test-subj="events"]').exists()).toEqual(false);
    });

    test('it does NOT render the timeline table when start is empty', () => {
      const wrapper = mount(
        <TestProviders>
          <QueryTabContentComponent {...props} start={''} />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="${TimelineTabs.query}-events-table"]`).exists()
      ).toEqual(true);
      expect(wrapper.find('[data-test-subj="events"]').exists()).toEqual(false);
    });

    test('it does NOT render the timeline table when end is empty', () => {
      const wrapper = mount(
        <TestProviders>
          <QueryTabContentComponent {...props} end={''} />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="${TimelineTabs.query}-events-table"]`).exists()
      ).toEqual(true);
      expect(wrapper.find('[data-test-subj="events"]').exists()).toEqual(false);
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
