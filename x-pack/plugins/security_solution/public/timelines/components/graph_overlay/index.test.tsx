/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/react';
import { mount } from 'enzyme';
import React from 'react';

import {
  useGlobalFullScreen,
  useTimelineFullScreen,
} from '../../../common/containers/use_full_screen';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  mockIndexNames,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../../common/mock';
import { TimelineId } from '../../../../common/types/timeline';
import { GraphOverlay } from '.';
import { createStore } from '../../../common/store';
import { useStateSyncingActions } from '../../../resolver/view/use_state_syncing_actions';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';

jest.mock('../../../common/containers/use_full_screen', () => ({
  useGlobalFullScreen: jest.fn(),
  useTimelineFullScreen: jest.fn(),
}));

jest.mock('../../../resolver/view/use_resolver_query_params_cleaner');
jest.mock('../../../resolver/view/use_state_syncing_actions');
const useStateSyncingActionsMock = useStateSyncingActions as jest.Mock;

jest.mock('../../../resolver/view/use_sync_selected_node');
jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      services: {
        sessionView: {
          getSessionView: () => <div />,
        },
        data: {
          search: {
            search: jest.fn(),
          },
        },
      },
    }),
  };
});

describe('GraphOverlay', () => {
  const { storage } = createSecuritySolutionStorageMock();

  beforeEach(() => {
    jest.clearAllMocks();
    (useGlobalFullScreen as jest.Mock).mockReturnValue({
      globalFullScreen: false,
      setGlobalFullScreen: jest.fn(),
    });
    (useTimelineFullScreen as jest.Mock).mockReturnValue({
      timelineFullScreen: false,
      setTimelineFullScreen: jest.fn(),
    });
  });

  describe('when used in an events viewer (i.e. in the Detections view, or the Host > Events view)', () => {
    test('it has 100% width when NOT in full screen mode', async () => {
      const wrapper = mount(
        <TestProviders>
          <GraphOverlay timelineId={TimelineId.test} openDetailsPanel={() => {}} />
        </TestProviders>
      );

      await waitFor(() => {
        const overlayContainer = wrapper.find('[data-test-subj="overlayContainer"]').first();
        expect(overlayContainer).toHaveStyleRule('width', '100%');
      });
    });

    test('it has a fixed position when in full screen mode', async () => {
      (useGlobalFullScreen as jest.Mock).mockReturnValue({
        globalFullScreen: true,
        setGlobalFullScreen: jest.fn(),
      });
      (useTimelineFullScreen as jest.Mock).mockReturnValue({
        timelineFullScreen: false,
        setTimelineFullScreen: jest.fn(),
      });

      const wrapper = mount(
        <TestProviders>
          <GraphOverlay timelineId={TimelineId.test} openDetailsPanel={() => {}} />
        </TestProviders>
      );

      await waitFor(() => {
        const overlayContainer = wrapper.find('[data-test-subj="overlayContainer"]').first();
        expect(overlayContainer).toHaveStyleRule('position', 'fixed');
      });
    });

    test('it gets index pattern from default data view', () => {
      mount(
        <TestProviders
          store={createStore(
            {
              ...mockGlobalState,
              timeline: {
                ...mockGlobalState.timeline,
                timelineById: {
                  test: {
                    ...mockGlobalState.timeline.timelineById.test,
                    graphEventId: 'definitely-not-null',
                  },
                },
              },
            },
            SUB_PLUGINS_REDUCER,
            kibanaObservable,
            storage
          )}
        >
          <GraphOverlay timelineId={TimelineId.test} openDetailsPanel={() => {}} />
        </TestProviders>
      );

      expect(useStateSyncingActionsMock.mock.calls[0][0].indices).toEqual(
        mockGlobalState.sourcerer.defaultDataView.patternList
      );
    });
  });

  describe('when used in the active timeline', () => {
    const timelineId = TimelineId.active;

    test('it has 100% width when NOT in full screen mode', async () => {
      const wrapper = mount(
        <TestProviders>
          <GraphOverlay timelineId={timelineId} openDetailsPanel={() => {}} />
        </TestProviders>
      );

      await waitFor(() => {
        const overlayContainer = wrapper.find('[data-test-subj="overlayContainer"]').first();
        expect(overlayContainer).toHaveStyleRule('width', '100%');
      });
    });

    test('it has 100% width when the active timeline is in full screen mode', async () => {
      (useGlobalFullScreen as jest.Mock).mockReturnValue({
        globalFullScreen: false,
        setGlobalFullScreen: jest.fn(),
      });
      (useTimelineFullScreen as jest.Mock).mockReturnValue({
        timelineFullScreen: true, // <-- true when the active timeline is in full screen mode
        setTimelineFullScreen: jest.fn(),
      });

      const wrapper = mount(
        <TestProviders>
          <GraphOverlay timelineId={timelineId} openDetailsPanel={() => {}} />
        </TestProviders>
      );

      await waitFor(() => {
        const overlayContainer = wrapper.find('[data-test-subj="overlayContainer"]').first();
        expect(overlayContainer).toHaveStyleRule('width', '100%');
      });
    });

    test('it gets index pattern from Timeline data view', () => {
      mount(
        <TestProviders
          store={createStore(
            {
              ...mockGlobalState,
              timeline: {
                ...mockGlobalState.timeline,
                timelineById: {
                  [timelineId]: {
                    ...mockGlobalState.timeline.timelineById[timelineId],
                    graphEventId: 'definitely-not-null',
                  },
                },
              },
              sourcerer: {
                ...mockGlobalState.sourcerer,
                sourcererScopes: {
                  ...mockGlobalState.sourcerer.sourcererScopes,
                  [SourcererScopeName.timeline]: {
                    ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
                    selectedPatterns: mockIndexNames,
                  },
                },
              },
            },
            SUB_PLUGINS_REDUCER,
            kibanaObservable,
            storage
          )}
        >
          <GraphOverlay timelineId={timelineId} openDetailsPanel={() => {}} />
        </TestProviders>
      );

      expect(useStateSyncingActionsMock.mock.calls[0][0].indices).toEqual(mockIndexNames);
    });
  });
});
