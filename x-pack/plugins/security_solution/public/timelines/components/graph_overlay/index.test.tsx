/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { waitFor } from '@testing-library/react';
import { mount } from 'enzyme';
import React from 'react';

import { useFullScreen } from '../../../common/containers/use_full_screen';
import { mockTimelineModel, TestProviders } from '../../../common/mock';
import { TimelineId, TimelineType } from '../../../../common/types/timeline';

import { GraphOverlay } from '.';

jest.mock('../../../common/hooks/use_selector', () => ({
  useShallowEqualSelector: jest.fn().mockReturnValue(mockTimelineModel),
}));

jest.mock('../../../common/containers/use_full_screen', () => ({
  useFullScreen: jest.fn(),
}));

describe('GraphOverlay', () => {
  beforeEach(() => {
    (useFullScreen as jest.Mock).mockReturnValue({
      timelineFullScreen: false,
      setTimelineFullScreen: jest.fn(),
      globalFullScreen: false,
      setGlobalFullScreen: jest.fn(),
    });
  });

  describe('when used in an events viewer (i.e. in the Detections view, or the Host > Events view)', () => {
    const isEventViewer = true;
    const timelineId = 'used-as-an-events-viewer';

    test('it has 100% width when isEventViewer is true and NOT in full screen mode', async () => {
      const wrapper = mount(
        <TestProviders>
          <GraphOverlay
            timelineId={timelineId}
            graphEventId="abcd"
            isEventViewer={isEventViewer}
            timelineType={TimelineType.default}
          />
        </TestProviders>
      );

      await waitFor(() => {
        const overlayContainer = wrapper.find('[data-test-subj="overlayContainer"]').first();
        expect(overlayContainer).toHaveStyleRule('width', '100%');
      });
    });

    test('it has a calculated width that makes room for the Timeline flyout button when isEventViewer is true in full screen mode', async () => {
      (useFullScreen as jest.Mock).mockReturnValue({
        timelineFullScreen: false,
        setTimelineFullScreen: jest.fn(),
        globalFullScreen: true, // <-- true when an events viewer is in full screen mode
        setGlobalFullScreen: jest.fn(),
      });

      const wrapper = mount(
        <TestProviders>
          <GraphOverlay
            timelineId={timelineId}
            graphEventId="abcd"
            isEventViewer={isEventViewer}
            timelineType={TimelineType.default}
          />
        </TestProviders>
      );

      await waitFor(() => {
        const overlayContainer = wrapper.find('[data-test-subj="overlayContainer"]').first();
        expect(overlayContainer).toHaveStyleRule('width', 'calc(100% - 36px)');
      });
    });
  });

  describe('when used in the active timeline', () => {
    const isEventViewer = false;
    const timelineId = TimelineId.active;

    test('it has 100% width when isEventViewer is false and NOT in full screen mode', async () => {
      const wrapper = mount(
        <TestProviders>
          <GraphOverlay
            timelineId={timelineId}
            graphEventId="abcd"
            isEventViewer={isEventViewer}
            timelineType={TimelineType.default}
          />
        </TestProviders>
      );

      await waitFor(() => {
        const overlayContainer = wrapper.find('[data-test-subj="overlayContainer"]').first();
        expect(overlayContainer).toHaveStyleRule('width', '100%');
      });
    });

    test('it has 100% width when isEventViewer is false and the active timeline is in full screen mode', async () => {
      (useFullScreen as jest.Mock).mockReturnValue({
        timelineFullScreen: true, // <-- true when the active timeline is in full screen mode
        setTimelineFullScreen: jest.fn(),
        globalFullScreen: false,
        setGlobalFullScreen: jest.fn(),
      });

      const wrapper = mount(
        <TestProviders>
          <GraphOverlay
            timelineId={timelineId}
            graphEventId="abcd"
            isEventViewer={isEventViewer}
            timelineType={TimelineType.default}
          />
        </TestProviders>
      );

      await waitFor(() => {
        const overlayContainer = wrapper.find('[data-test-subj="overlayContainer"]').first();
        expect(overlayContainer).toHaveStyleRule('width', '100%');
      });
    });
  });
});
