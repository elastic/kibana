/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import moment from 'moment';

import type { DataViewBase } from '@kbn/es-query';
import { fields } from '@kbn/data-plugin/common/mocks';

import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { TestProviders } from '../../../../common/mock';
import { usePreviewHistogram } from './use_preview_histogram';

import { PreviewHistogram } from './preview_histogram';
import { ALL_VALUES_ZEROS_TITLE } from '../../../../common/components/charts/translation';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/containers/use_global_time');
jest.mock('./use_preview_histogram');
jest.mock('../../../../common/utils/normalize_time_range');

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
      const wrapper = render(
        <TestProviders>
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

      expect(await wrapper.findByText('hello grid')).toBeTruthy();
      expect(await wrapper.findByText(ALL_VALUES_ZEROS_TITLE)).toBeTruthy();
    });
  });

  describe('when there is data', () => {
    test('it renders loader when isLoading is true', async () => {
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

      const wrapper = render(
        <TestProviders>
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

      expect(await wrapper.findByTestId('preview-histogram-loading')).toBeTruthy();
    });
  });

  describe('when advanced options passed', () => {
    test('it uses timeframeStart and timeframeEnd to specify the time range of the preview', async () => {
      const format = 'YYYY-MM-DD HH:mm:ss';
      const start = '2015-03-12 05:17:10';
      const end = '2020-03-12 05:17:10';

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

      const wrapper = render(
        <TestProviders>
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

      expect(await wrapper.findByTestId('preview-histogram-loading')).toBeTruthy();
    });
  });
});
