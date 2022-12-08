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

import { useGlobalTime } from '../../../../common/containers/use_global_time';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../../../common/mock';
import { usePreviewHistogram } from './use_preview_histogram';

import { PreviewHistogram } from './preview_histogram';
import { ALL_VALUES_ZEROS_TITLE } from '../../../../common/components/charts/translation';
import { useGetUserCasesPermissions } from '../../../../common/lib/kibana';
import { useTimelineEvents } from '../../../../common/components/events_viewer/use_timelines_events';
import { TableId } from '../../../../../common/types';
import { createStore } from '../../../../common/store';
import { mockEventViewerResponse } from '../../../../common/components/events_viewer/mock';
import { mount } from 'enzyme';
import type { UseFieldBrowserOptionsProps } from '../../../../timelines/components/fields_browser';
import type { TransformColumnsProps } from '../../../../common/components/control_columns';

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
jest.mock('./use_preview_histogram');
jest.mock('../../../../common/utils/normalize_time_range');
jest.mock('../../../../common/components/events_viewer/use_timelines_events');

const originalKibanaLib = jest.requireActual('../../../../common/lib/kibana');

// Restore the useGetUserCasesPermissions so the calling functions can receive a valid permissions object
// The returned permissions object will indicate that the user does not have permissions by default
const mockUseGetUserCasesPermissions = useGetUserCasesPermissions as jest.Mock;
mockUseGetUserCasesPermissions.mockImplementation(originalKibanaLib.useGetUserCasesPermissions);
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

  const { storage } = createSecuritySolutionStorageMock();

  const store = createStore(
    {
      ...mockGlobalState,
      dataTable: {
        ...mockGlobalState.dataTable,
        tableById: {
          [TableId.rulePreview]: {
            ...mockGlobalState.dataTable.tableById[TableId.test],
          },
        },
      },
    },
    SUB_PLUGINS_REDUCER,
    kibanaObservable,
    storage
  );

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when there is no data', () => {
    (usePreviewHistogram as jest.Mock).mockReturnValue([
      false,
      {
        inspect: { dsl: [], response: [] },
        totalCount: 1,
        refetch: jest.fn(),
        data: [],
        buckets: [],
      },
    ]);

    test('it renders an empty histogram and table', async () => {
      (useTimelineEvents as jest.Mock).mockReturnValue([
        false,
        {
          ...mockEventViewerResponse,
          totalCount: 1,
        },
      ]);
      const wrapper = mount(
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

      expect(wrapper.findWhere((node) => node.text() === '1 alert').exists()).toBeTruthy();
      expect(
        wrapper.findWhere((node) => node.text() === ALL_VALUES_ZEROS_TITLE).exists()
      ).toBeTruthy();
    });
  });

  describe('when there is data', () => {
    test('it renders loader when isLoading is true', () => {
      (usePreviewHistogram as jest.Mock).mockReturnValue([
        true,
        {
          inspect: { dsl: [], response: [] },
          totalCount: 1,
          refetch: jest.fn(),
          data: [],
          buckets: [],
        },
      ]);

      const wrapper = mount(
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

      expect(wrapper.find(`[data-test-subj="preview-histogram-loading"]`).exists()).toBeTruthy();
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
      const usePreviewHistogramMock = usePreviewHistogram as jest.Mock;
      usePreviewHistogramMock.mockReturnValue([
        true,
        {
          inspect: { dsl: [], response: [] },
          totalCount: 1,
          refetch: jest.fn(),
          data: [],
          buckets: [],
        },
      ]);

      usePreviewHistogramMock.mockImplementation(
        ({ startDate, endDate }: { startDate: string; endDate: string }) => {
          expect(startDate).toEqual('2015-03-12T09:17:10.000Z');
          expect(endDate).toEqual('2020-03-12T09:17:10.000Z');
          return [
            true,
            {
              inspect: { dsl: [], response: [] },
              totalCount: 1,
              refetch: jest.fn(),
              data: [],
              buckets: [],
            },
          ];
        }
      );

      const wrapper = mount(
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

      expect(wrapper.find(`[data-test-subj="preview-histogram-loading"]`).exists()).toBeTruthy();
    });
  });
});
