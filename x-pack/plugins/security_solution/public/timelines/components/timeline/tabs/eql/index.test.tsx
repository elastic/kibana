/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import useResizeObserver from 'use-resize-observer/polyfilled';
import { defaultRowRenderers } from '../../body/renderers';
import { DefaultCellRenderer } from '../../cell_rendering/default_cell_renderer';
import { defaultHeaders, mockTimelineData } from '../../../../../common/mock';
import { TestProviders } from '../../../../../common/mock/test_providers';
import type { Props as EqlTabContentComponentProps } from '.';
import { EqlTabContentComponent } from '.';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { useTimelineEvents } from '../../../../containers';
import { useTimelineEventsDetails } from '../../../../containers/details';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { mockSourcererScope } from '../../../../../sourcerer/containers/mocks';
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
jest.mock('../../../../../sourcerer/containers/use_signal_helpers', () => ({
  useSignalHelpers: () => ({ signalIndexNeedsInit: false }),
}));

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));

jest.mock('../../../../../common/lib/kibana');

describe('Timeline', () => {
  let props = {} as EqlTabContentComponentProps;
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
      activeTab: TimelineTabs.eql,
      columns: defaultHeaders,
      end: endDate,
      eqlOptions: {},
      expandedDetail: {},
      isLive: false,
      itemsPerPage: 5,
      itemsPerPageOptions: [5, 10, 20],
      onEventClosed: jest.fn(),
      renderCellValue: DefaultCellRenderer,
      rowRenderers: defaultRowRenderers,
      showExpandedDetails: false,
      start: startDate,
      timelineId: TimelineId.test,
      timerangeKind: 'absolute',
      pinnedEventIds: {},
      eventIdToNoteIds: {},
    };
  });

  describe('rendering', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          <EqlTabContentComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('EqlTabContentComponent')).toMatchSnapshot();
    });

    test('it renders the timeline header', () => {
      const wrapper = mount(
        <TestProviders>
          <EqlTabContentComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timelineHeader"]').exists()).toEqual(true);
    });

    test('it renders the timeline table', () => {
      const wrapper = mount(
        <TestProviders>
          <EqlTabContentComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="${TimelineTabs.eql}-events-table"]`).exists()).toEqual(
        true
      );
    });

    test('it renders the timeline column headers', () => {
      const wrapper = mount(
        <TestProviders>
          <EqlTabContentComponent {...props} />
        </TestProviders>
      );

      expect(
        wrapper
          .find(
            `[data-test-subj="${TimelineTabs.eql}-events-table"] [data-test-subj="column-headers"]`
          )
          .exists()
      ).toEqual(true);
    });

    test('it does NOT renders the timeline global sorting icon in headers', () => {
      const wrapper = mount(
        <TestProviders>
          <EqlTabContentComponent {...props} />
        </TestProviders>
      );
      expect(
        wrapper
          .find(
            `[data-test-subj="${TimelineTabs.eql}-events-table"] [data-test-subj="column-headers"] [data-test-subj="timeline-sorting-fields"]`
          )
          .exists()
      ).toEqual(false);
    });

    test('it does render the timeline table when the source is loading with no events', () => {
      (useSourcererDataView as jest.Mock).mockReturnValue({
        browserFields: {},
        loading: true,
        indexPattern: {},
        selectedPatterns: [],
        missingPatterns: [],
      });
      const wrapper = mount(
        <TestProviders>
          <EqlTabContentComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="${TimelineTabs.eql}-events-table"]`).exists()).toEqual(
        true
      );
      expect(wrapper.find('[data-test-subj="events"]').exists()).toEqual(false);
    });

    test('it does NOT render the timeline table when start is empty', () => {
      const wrapper = mount(
        <TestProviders>
          <EqlTabContentComponent {...props} start={''} />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="${TimelineTabs.eql}-events-table"]`).exists()).toEqual(
        true
      );
      expect(wrapper.find('[data-test-subj="events"]').exists()).toEqual(false);
    });

    test('it does NOT render the timeline table when end is empty', () => {
      const wrapper = mount(
        <TestProviders>
          <EqlTabContentComponent {...props} end={''} />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="${TimelineTabs.eql}-events-table"]`).exists()).toEqual(
        true
      );
      expect(wrapper.find('[data-test-subj="events"]').exists()).toEqual(false);
    });

    it('it does NOT render the timeline footer when query is empty', () => {
      const wrapper = mount(
        <TestProviders>
          <EqlTabContentComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timeline-footer"]').exists()).toEqual(false);
    });

    it('it shows the timeline footer when query is non-empty', () => {
      const wrapper = mount(
        <TestProviders>
          <EqlTabContentComponent {...{ ...props, eqlOptions: { query: 'query' } }} />
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
          <EqlTabContentComponent {...props} />
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
          <EqlTabContentComponent {...props} />
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
          <EqlTabContentComponent {...props} />
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
          <EqlTabContentComponent {...props} />
        </TestProviders>
      );

      expect(fetchNotesByDocumentIds).not.toHaveBeenCalled();
    });
  });
});
