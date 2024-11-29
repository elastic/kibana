/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useResizeObserver from 'use-resize-observer/polyfilled';
import type { Dispatch } from 'redux';

import { defaultRowRenderers } from '../../body/renderers';
import { DefaultCellRenderer } from '../../cell_rendering/default_cell_renderer';
import { defaultHeaders, mockTimelineData } from '../../../../../common/mock';
import { TestProviders } from '../../../../../common/mock/test_providers';

import type { Props as EqlTabContentComponentProps } from '.';
import { EqlTabContentComponent } from '.';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { useTimelineEvents } from '../../../../containers';
import { useTimelineEventsDetails } from '../../../../containers/details';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { mockSourcererScope } from '../../../../../sourcerer/containers/mocks';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import type { ExperimentalFeatures } from '../../../../../../common';
import { allowedExperimentalValues } from '../../../../../../common';
import { render, screen } from '@testing-library/react';

jest.mock('../../../../containers', () => ({
  useTimelineEvents: jest.fn(),
}));
jest.mock('../../../../containers/details', () => ({
  useTimelineEventsDetails: jest.fn(),
}));
jest.mock('../../../fields_browser', () => ({
  useFieldBrowserOptions: jest.fn(),
}));

jest.mock('../../../../../sourcerer/containers');
jest.mock('../../../../../sourcerer/containers/use_signal_helpers', () => ({
  useSignalHelpers: () => ({ signalIndexNeedsInit: false }),
}));

jest.mock('../../../../../common/hooks/use_experimental_features');
const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));

jest.mock('../../../../../common/lib/kibana');

describe('EQL Tab', () => {
  let props = {} as EqlTabContentComponentProps;
  const startDate = '2018-03-23T18:49:23.132Z';
  const endDate = '2018-03-24T03:33:52.253Z';

  beforeAll(() => {
    // https://github.com/atlassian/react-beautiful-dnd/blob/4721a518356f72f1dac45b5fd4ee9d466aa2996b/docs/guides/setup-problem-detection-and-error-recovery.md#disable-logging
    Object.defineProperty(window, '__@hello-pangea/dnd-disable-dev-warnings', {
      get() {
        return true;
      },
    });
  });

  beforeEach(() => {
    (useTimelineEvents as jest.Mock).mockReturnValue([
      false,
      {
        events: mockTimelineData.slice(0, 1),
        pageInfo: {
          activePage: 0,
          totalPages: 10,
        },
      },
    ]);
    (useTimelineEventsDetails as jest.Mock).mockReturnValue([false, {}]);

    (useSourcererDataView as jest.Mock).mockReturnValue(mockSourcererScope);

    (useIsExperimentalFeatureEnabledMock as jest.Mock).mockImplementation(
      (feature: keyof ExperimentalFeatures) => {
        return allowedExperimentalValues[feature];
      }
    );

    props = {
      dispatch: {} as Dispatch,
      activeTab: TimelineTabs.eql,
      columns: defaultHeaders,
      end: endDate,
      eqlOptions: {},
      isLive: false,
      itemsPerPage: 5,
      itemsPerPageOptions: [5, 10, 20],
      renderCellValue: DefaultCellRenderer,
      rowRenderers: defaultRowRenderers,
      start: startDate,
      timelineId: TimelineId.test,
      timerangeKind: 'absolute',
      pinnedEventIds: {},
      eventIdToNoteIds: {},
    };
  });

  describe('rendering', () => {
    test('should render the timeline table', async () => {
      render(
        <TestProviders>
          <EqlTabContentComponent {...props} />
        </TestProviders>
      );

      expect(await screen.findByTestId('discoverDocTable')).toBeVisible();
    });

    test('it renders the timeline column headers', async () => {
      render(
        <TestProviders>
          <EqlTabContentComponent {...props} />
        </TestProviders>
      );

      expect(await screen.findByTestId('discoverDocTable')).toBeVisible();
    });

    test('should render correct placeholder when there are not results', async () => {
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

      render(
        <TestProviders>
          <EqlTabContentComponent {...props} />
        </TestProviders>
      );

      expect(await screen.findByText('No results found')).toBeVisible();
    });
  });
});
