/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/react';
import { mount } from 'enzyme';
import React from 'react';

import { mockTimelineModel, TestProviders } from '../../../common/mock';
import { TimelineId } from '../../../../common/types/timeline';
import { GraphOverlay } from '.';

jest.mock('../../../common/hooks/use_selector', () => ({
  useShallowEqualSelector: jest.fn().mockReturnValue(mockTimelineModel.savedObjectId),
  useDeepEqualSelector: jest.fn().mockReturnValue(mockTimelineModel),
}));

jest.mock('../../../resolver/view/use_resolver_query_params_cleaner');
jest.mock('../../../resolver/view/use_state_syncing_actions');
jest.mock('../../../resolver/view/use_sync_selected_node');

describe('GraphOverlay', () => {
  describe('when used in an events viewer (i.e. in the Detections view, or the Host > Events view)', () => {
    const isEventViewer = true;

    test('it has 100% width when isEventViewer is true and NOT in full screen mode', async () => {
      const wrapper = mount(
        <TestProviders>
          <GraphOverlay timelineId={TimelineId.test} isEventViewer={isEventViewer} />
        </TestProviders>
      );

      await waitFor(() => {
        const overlayContainer = wrapper.find('[data-test-subj="overlayContainer"]').first();
        expect(overlayContainer).toHaveStyleRule('width', '100%');
      });
    });
  });

  describe('when used in the active timeline', () => {
    const isEventViewer = false;
    const timelineId = TimelineId.active;

    test('it has 100% width when isEventViewer is false and NOT in full screen mode', async () => {
      const wrapper = mount(
        <TestProviders>
          <GraphOverlay timelineId={timelineId} isEventViewer={isEventViewer} />
        </TestProviders>
      );

      await waitFor(() => {
        const overlayContainer = wrapper.find('[data-test-subj="overlayContainer"]').first();
        expect(overlayContainer).toHaveStyleRule('width', '100%');
      });
    });
  });
});
