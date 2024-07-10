/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import useResizeObserver from 'use-resize-observer/polyfilled';

import { DefaultCellRenderer } from '../../cell_rendering/default_cell_renderer';
import { defaultHeaders, mockTimelineData } from '../../../../../common/mock';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { defaultRowRenderers } from '../../body/renderers';
import type { Sort } from '../../body/sort';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { useTimelineEvents } from '../../../../containers';
import { useTimelineEventsDetails } from '../../../../containers/details';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { mockSourcererScope } from '../../../../../sourcerer/containers/mocks';
import type { Props as PinnedTabContentComponentProps } from '.';
import { PinnedTabContentComponent } from '.';
import { Direction } from '../../../../../../common/search_strategy';
import { mockCasesContext } from '@kbn/cases-plugin/public/mocks/mock_cases_context';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import * as notesThunks from '../../../../../notes/store/notes.slice';
jest.mock('../../../../../common/hooks/use_experimental_features');

jest.mock('../../../../containers', () => ({
  useTimelineEvents: jest.fn(),
}));
jest.mock('../../../../containers/details', () => ({
  useTimelineEventsDetails: jest.fn(),
}));
jest.mock('../../../fields_browser', () => ({
  useFieldBrowserOptions: jest.fn(),
}));
jest.mock('../../body/events', () => ({
  Events: () => <></>,
}));

jest.mock('../../../../../sourcerer/containers');

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));

const useAddToTimeline = () => ({
  beginDrag: jest.fn(),
  cancelDrag: jest.fn(),
  dragToLocation: jest.fn(),
  endDrag: jest.fn(),
  hasDraggableLock: jest.fn(),
  startDragToTimeline: jest.fn(),
});

jest.mock('../../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../../common/lib/kibana');
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
          getUseAddToTimeline: () => useAddToTimeline,
        },
        triggersActionsUi: { getFieldBrowser: jest.fn() },
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
      columnType: 'date',
      esTypes: ['date'],
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
      eventIdToNoteIds: {},
      expandedDetail: {},
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

  describe('fetch notes', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch notes for all documents in the table if the right feature flags are on', async () => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation((feature: string) => {
        if (feature === 'expandableFlyoutDisabled') return false;
        if (feature === 'securitySolutionNotesEnabled') return true;
      });

      const fetchNotesByDocumentIds = jest.spyOn(notesThunks, 'fetchNotesByDocumentIds');

      mount(
        <TestProviders>
          <PinnedTabContentComponent {...props} />
        </TestProviders>
      );

      expect(fetchNotesByDocumentIds).toHaveBeenCalled();
    });

    it('should not fetch notes if the securitySolutionNotesEnabled feature flag is off', () => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation((feature: string) => {
        if (feature === 'expandableFlyoutDisabled') return false;
        if (feature === 'securitySolutionNotesEnabled') return false;
      });

      const fetchNotesByDocumentIds = jest.spyOn(notesThunks, 'fetchNotesByDocumentIds');

      mount(
        <TestProviders>
          <PinnedTabContentComponent {...props} />
        </TestProviders>
      );

      expect(fetchNotesByDocumentIds).not.toHaveBeenCalled();
    });

    it('should not fetch notes if the expandableFlyoutDisabled feature flag is on', () => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation((feature: string) => {
        if (feature === 'expandableFlyoutDisabled') return true;
        if (feature === 'securitySolutionNotesEnabled') return true;
      });

      const fetchNotesByDocumentIds = jest.spyOn(notesThunks, 'fetchNotesByDocumentIds');

      mount(
        <TestProviders>
          <PinnedTabContentComponent {...props} />
        </TestProviders>
      );

      expect(fetchNotesByDocumentIds).not.toHaveBeenCalled();
    });

    it(`should not fetch notes if there aren't any alerts`, () => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation((feature: string) => {
        if (feature === 'expandableFlyoutDisabled') return false;
        if (feature === 'securitySolutionNotesEnabled') return true;
      });
      (useTimelineEvents as jest.Mock).mockReturnValue([
        false,
        {
          events: [],
          pageInfo: {
            activePage: 0,
            totalPages: 10,
          },
        },
      ]);

      const fetchNotesByDocumentIds = jest.spyOn(notesThunks, 'fetchNotesByDocumentIds');

      mount(
        <TestProviders>
          <PinnedTabContentComponent {...props} />
        </TestProviders>
      );

      expect(fetchNotesByDocumentIds).not.toHaveBeenCalled();
    });
  });
});
