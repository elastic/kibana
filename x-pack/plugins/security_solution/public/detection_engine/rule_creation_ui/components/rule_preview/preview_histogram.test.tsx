/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';

import type { DataViewBase } from '@kbn/es-query';
import { fields } from '@kbn/data-plugin/common/mocks';
import { render } from '@testing-library/react';

import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { createMockStore, mockGlobalState, TestProviders } from '../../../../common/mock';
import { VisualizationEmbeddable } from '../../../../common/components/visualization_actions/visualization_embeddable';
import { useVisualizationResponse } from '../../../../common/components/visualization_actions/use_visualization_response';

import { PreviewHistogram } from './preview_histogram';
import { useTimelineEvents } from '../../../../common/components/events_viewer/use_timelines_events';
import { TableId } from '@kbn/securitysolution-data-table';
import { mockEventViewerResponse } from '../../../../common/components/events_viewer/mock';
import type { UseFieldBrowserOptionsProps } from '../../../../timelines/components/fields_browser';
import type { TransformColumnsProps } from '../../../../common/components/control_columns';
import { INSPECT_ACTION } from '../../../../common/components/visualization_actions/use_actions';

jest.mock('../../../../common/components/control_columns', () => ({
  transformControlColumns: (props: TransformColumnsProps) => [],
  checkBoxControlColumn: {
    id: 'checkbox-control-column',
    width: 32,
    headerCellRender: jest.fn(),
    rowCellRender: jest.fn(),
  },
}));
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/containers/use_global_time');
jest.mock('../../../../common/utils/normalize_time_range');
jest.mock('../../../../common/components/events_viewer/use_timelines_events');
jest.mock('../../../../common/components/visualization_actions/visualization_embeddable');
jest.mock('../../../../common/components/visualization_actions/use_visualization_response', () => ({
  useVisualizationResponse: jest.fn(),
}));

jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));
const mockVisualizationEmbeddable = VisualizationEmbeddable as unknown as jest.Mock;

const mockUseFieldBrowserOptions = jest.fn();
jest.mock('../../../../timelines/components/fields_browser', () => ({
  useFieldBrowserOptions: (props: UseFieldBrowserOptionsProps) => mockUseFieldBrowserOptions(props),
}));

const getMockIndexPattern = (): DataViewBase => ({
  fields,
  id: '1234',
  title: 'logstash-*',
});

const getLastMonthTimeframe = () => ({
  timeframeStart: moment().subtract(1, 'month'),
  timeframeEnd: moment(),
  interval: '5m',
  lookback: '1m',
});

(useTimelineEvents as jest.Mock).mockReturnValue([false, mockEventViewerResponse]);

describe('PreviewHistogram', () => {
  const mockSetQuery = jest.fn();

  beforeEach(() => {
    (useGlobalTime as jest.Mock).mockReturnValue({
      from: '2020-07-07T08:20:18.966Z',
      isInitializing: false,
      to: '2020-07-08T08:20:18.966Z',
      setQuery: mockSetQuery,
    });
  });

  const store = createMockStore({
    ...mockGlobalState,
    dataTable: {
      ...mockGlobalState.dataTable,
      tableById: {
        [TableId.rulePreview]: {
          ...mockGlobalState.dataTable.tableById[TableId.test],
        },
      },
    },
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PreviewHistogram', () => {
    test('should render Lens embeddable', () => {
      (useVisualizationResponse as jest.Mock).mockReturnValue({
        loading: false,
        requests: [],
        responses: [{ hits: { total: 1 } }],
      });

      const { getByTestId } = render(
        <TestProviders store={store}>
          <PreviewHistogram
            addNoiseWarning={jest.fn()}
            timeframeOptions={getLastMonthTimeframe()}
            previewId={'test-preview-id'}
            spaceId={'default'}
            ruleType={'query'}
            indexPattern={getMockIndexPattern()}
          />
        </TestProviders>
      );

      expect(getByTestId('visualization-embeddable')).toBeInTheDocument();
    });

    test('should render inspect action', () => {
      (useVisualizationResponse as jest.Mock).mockReturnValue({
        loading: false,
        requests: [],
        responses: [{ hits: { total: 1 } }],
      });

      render(
        <TestProviders store={store}>
          <PreviewHistogram
            addNoiseWarning={jest.fn()}
            timeframeOptions={getLastMonthTimeframe()}
            previewId={'test-preview-id'}
            spaceId={'default'}
            ruleType={'query'}
            indexPattern={getMockIndexPattern()}
          />
        </TestProviders>
      );

      expect(mockVisualizationEmbeddable.mock.calls[0][0].withActions).toEqual(INSPECT_ACTION);
    });

    test('should disable filter when clicking on the chart', () => {
      (useVisualizationResponse as jest.Mock).mockReturnValue({
        loading: false,
        requests: [],
        responses: [{ hits: { total: 1 } }],
      });

      render(
        <TestProviders store={store}>
          <PreviewHistogram
            addNoiseWarning={jest.fn()}
            timeframeOptions={getLastMonthTimeframe()}
            previewId={'test-preview-id'}
            spaceId={'default'}
            ruleType={'query'}
            indexPattern={getMockIndexPattern()}
          />
        </TestProviders>
      );

      expect(mockVisualizationEmbeddable.mock.calls[0][0].disableOnClickFilter).toBeTruthy();
    });

    test('should show chart legend when if it is not EQL rule', () => {
      (useVisualizationResponse as jest.Mock).mockReturnValue({
        loading: false,
        requests: [],
        responses: [{ hits: { total: 1 } }],
      });

      render(
        <TestProviders store={store}>
          <PreviewHistogram
            addNoiseWarning={jest.fn()}
            timeframeOptions={getLastMonthTimeframe()}
            previewId={'test-preview-id'}
            spaceId={'default'}
            ruleType={'query'}
            indexPattern={getMockIndexPattern()}
          />
        </TestProviders>
      );

      expect(mockVisualizationEmbeddable.mock.calls[0][0].extraOptions.showLegend).toBeTruthy();
    });
  });

  describe('when advanced options passed', () => {
    test('it uses timeframeStart and timeframeEnd to specify the time range of the preview', () => {
      const format = 'YYYY-MM-DD HH:mm:ss';
      const start = '2015-03-12 05:17:10';
      const end = '2020-03-12 05:17:10';
      (useTimelineEvents as jest.Mock).mockReturnValue([
        false,
        {
          ...mockEventViewerResponse,
          totalCount: 0,
        },
      ]);
      (useVisualizationResponse as jest.Mock).mockReturnValue({
        loading: false,
        requests: [],
        responses: [{ hits: { total: 0 } }],
      });

      render(
        <TestProviders store={store}>
          <PreviewHistogram
            addNoiseWarning={jest.fn()}
            previewId={'test-preview-id'}
            spaceId={'default'}
            ruleType={'query'}
            indexPattern={getMockIndexPattern()}
            timeframeOptions={{
              timeframeStart: moment(start, format),
              timeframeEnd: moment(end, format),
              interval: '5m',
              lookback: '1m',
            }}
          />
        </TestProviders>
      );

      expect(mockVisualizationEmbeddable.mock.calls[0][0].timerange).toEqual({
        from: moment(start, format).toISOString(),
        to: moment(end, format).toISOString(),
      });
    });
  });
});
