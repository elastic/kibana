/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createMockStore, mockGlobalState } from '../../../../common/mock';
import { TestProviders } from '../../../../common/mock/test_providers';

import { TabsContent } from '.';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import { TimelineType } from '../../../../../common/api/timeline';
import { useEsqlAvailability } from '../../../../common/hooks/esql/use_esql_availability';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('../../../../common/hooks/esql/use_esql_availability', () => ({
  useEsqlAvailability: jest.fn().mockReturnValue({
    isESQLTabInTimelineEnabled: true,
  }),
}));

const useEsqlAvailabilityMock = useEsqlAvailability as jest.Mock;

describe('Timeline', () => {
  describe('esql tab', () => {
    const esqlTabSubj = `timelineTabs-${TimelineTabs.esql}`;
    const defaultProps = {
      renderCellValue: () => {},
      rowRenderers: [],
      timelineId: TimelineId.test,
      timelineType: TimelineType.default,
      timelineDescription: '',
    };

    it('should show the esql tab', () => {
      render(
        <TestProviders>
          <TabsContent {...defaultProps} />
        </TestProviders>
      );
      expect(screen.getByTestId(esqlTabSubj)).toBeVisible();
    });

    it('should not show the esql tab when the advanced setting is disabled', async () => {
      useEsqlAvailabilityMock.mockReturnValue({
        isESQLTabInTimelineEnabled: false,
      });
      render(
        <TestProviders>
          <TabsContent {...defaultProps} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.queryByTestId(esqlTabSubj)).toBeNull();
      });
    });

    it('should show the esql tab when the advanced setting is disabled, but an esql query is present', async () => {
      useEsqlAvailabilityMock.mockReturnValue({
        isESQLTabInTimelineEnabled: false,
      });

      const stateWithSavedSearchId = structuredClone(mockGlobalState);
      stateWithSavedSearchId.timeline.timelineById[TimelineId.test].savedSearchId = 'test-id';
      const mockStore = createMockStore(stateWithSavedSearchId);

      render(
        <TestProviders store={mockStore}>
          <TabsContent {...defaultProps} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.queryByTestId(esqlTabSubj)).toBeVisible();
      });
    });
  });
});
