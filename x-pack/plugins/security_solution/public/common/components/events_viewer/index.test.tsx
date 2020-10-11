/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import useResizeObserver from 'use-resize-observer/polyfilled';

import '../../mock/match_media';
import { waitFor } from '@testing-library/react';
import { TestProviders } from '../../mock';
import { useMountAppended } from '../../utils/use_mount_appended';

import { mockEventViewerResponse } from './mock';
import { StatefulEventsViewer } from '.';
import { eventsDefaultModel } from './default_model';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useTimelineEvents } from '../../../timelines/containers';

jest.mock('../../../timelines/containers', () => ({
  useTimelineEvents: jest.fn(),
}));

jest.mock('../../components/url_state/normalize_time_range.ts');

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));

const from = '2019-08-27T22:10:56.794Z';
const to = '2019-08-26T22:10:56.791Z';

const testProps = {
  defaultModel: eventsDefaultModel,
  end: to,
  indexNames: [],
  id: 'test-stateful-events-viewer',
  scopeId: SourcererScopeName.default,
  start: from,
};
describe('StatefulEventsViewer', () => {
  const mount = useMountAppended();

  (useTimelineEvents as jest.Mock).mockReturnValue([false, mockEventViewerResponse]);

  test('it renders the events viewer', async () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulEventsViewer {...testProps} />
      </TestProviders>
    );

    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find('[data-test-subj="events-viewer-panel"]').first().exists()).toBe(true);
    });
  });

  // InspectButtonContainer controls displaying InspectButton components
  test('it renders InspectButtonContainer', async () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulEventsViewer {...testProps} />
      </TestProviders>
    );

    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find(`InspectButtonContainer`).exists()).toBe(true);
    });
  });
});
