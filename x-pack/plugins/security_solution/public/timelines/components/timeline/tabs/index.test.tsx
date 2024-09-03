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
import { TimelineTypeEnum } from '../../../../../common/api/timeline';
import { useEsqlAvailability } from '../../../../common/hooks/esql/use_esql_availability';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useLocation: () => ({}),
  };
});

jest.mock('../../../../common/hooks/esql/use_esql_availability', () => ({
  useEsqlAvailability: jest.fn().mockReturnValue({
    isEsqlAdvancedSettingEnabled: true,
    isTimelineEsqlEnabledByFeatureFlag: true,
  }),
}));

const useEsqlAvailabilityMock = useEsqlAvailability as jest.Mock;

describe('Timeline', () => {
  describe('esql tab', () => {
    const esqlTabSubj = `timelineTabs-${TimelineTabs.esql}`;
    const defaultProps = {
      renderCellValue: () => {
        return null;
      },
      rowRenderers: [],
      timelineId: TimelineId.test,
      timelineType: TimelineTypeEnum.default,
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

    describe('no existing esql query is present', () => {
      it('should not show the esql tab when the advanced setting is disabled', async () => {
        useEsqlAvailabilityMock.mockReturnValue({
          isEsqlAdvancedSettingEnabled: false,
          isTimelineEsqlEnabledByFeatureFlag: true,
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
      it('should not show the esql tab when the esql is disabled by feature flag', async () => {
        useEsqlAvailabilityMock.mockReturnValue({
          isEsqlAdvancedSettingEnabled: false,
          isTimelineEsqlEnabledByFeatureFlag: false,
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
    });

    describe('existing esql query is present', () => {
      let mockStore: ReturnType<typeof createMockStore>;
      beforeEach(() => {
        const stateWithSavedSearchId = structuredClone(mockGlobalState);
        stateWithSavedSearchId.timeline.timelineById[TimelineId.test].savedSearchId = 'test-id';
        mockStore = createMockStore(stateWithSavedSearchId);
      });

      it('should show the esql tab when the advanced setting is disabled', async () => {
        useEsqlAvailabilityMock.mockReturnValue({
          isESQLTabInTimelineEnabled: false,
          isTimelineEsqlEnabledByFeatureFlag: true,
        });

        render(
          <TestProviders store={mockStore}>
            <TabsContent {...defaultProps} />
          </TestProviders>
        );

        await waitFor(() => {
          expect(screen.queryByTestId(esqlTabSubj)).toBeVisible();
        });
      });

      it('should not show the esql tab when the esql is disabled by the feature flag', async () => {
        useEsqlAvailabilityMock.mockReturnValue({
          isESQLTabInTimelineEnabled: true,
          isTimelineEsqlEnabledByFeatureFlag: false,
        });

        render(
          <TestProviders store={mockStore}>
            <TabsContent {...defaultProps} />
          </TestProviders>
        );

        await waitFor(() => {
          expect(screen.queryByTestId(esqlTabSubj)).toBeNull();
        });
      });
    });
  });
});
