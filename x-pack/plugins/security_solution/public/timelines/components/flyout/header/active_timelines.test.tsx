/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../../../common/mock';
import React from 'react';
import type { ActiveTimelinesProps } from './active_timelines';
import { ActiveTimelines } from './active_timelines';
import { TimelineId } from '../../../../../common/types';
import { TimelineType } from '../../../../../common/api/timeline';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSecuritySolutionStorageMock } from '@kbn/timelines-plugin/public/mock/mock_local_storage';
import { createStore } from '../../../../common/store';

const { storage } = createSecuritySolutionStorageMock();

const store = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

const TestComponent = (props: ActiveTimelinesProps) => {
  return (
    <TestProviders store={store}>
      <ActiveTimelines {...props} />
    </TestProviders>
  );
};

describe('ActiveTimelines', () => {
  describe('default timeline', () => {
    it('should render timeline title as button when minimized', () => {
      render(
        <TestComponent
          timelineId={'test'}
          timelineTitle={TimelineId.test}
          isOpen={false}
          timelineType={TimelineType.default}
        />
      );

      expect(screen.getByLabelText(/Open timeline timeline-test/).nodeName.toLowerCase()).toBe(
        'button'
      );
    });

    it('should render timeline title as text when maximized', () => {
      render(
        <TestComponent
          timelineId={'test'}
          timelineTitle={TimelineId.test}
          isOpen={true}
          timelineType={TimelineType.default}
        />
      );
      expect(screen.queryByLabelText(/Open timeline timeline-test/)).toBeFalsy();
    });

    it('should maximized timeline when clicked on minimized timeline', async () => {
      render(
        <TestComponent
          timelineId={'test'}
          timelineTitle={TimelineId.test}
          isOpen={false}
          timelineType={TimelineType.default}
        />
      );

      fireEvent.click(screen.getByLabelText(/Open timeline timeline-test/));

      await waitFor(() => {
        expect(store.getState().timeline.timelineById.test.show).toBe(true);
      });
    });
  });

  describe('template timeline', () => {
    it('should render timeline template title as button when minimized', () => {
      render(
        <TestComponent
          timelineId="test"
          timelineTitle=""
          isOpen={false}
          timelineType={TimelineType.template}
        />
      );

      expect(screen.getByTestId(/timeline-title/)).toHaveTextContent(/Untitled template/);
    });
  });
});
