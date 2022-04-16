/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { TestProviders } from '../../../../common/mock';
import { usePreviewHistogram } from './use_preview_histogram';

import { PreviewHistogram } from './preview_histogram';
import { ALL_VALUES_ZEROS_TITLE } from '../../../../common/components/charts/translation';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/containers/use_global_time');
jest.mock('./use_preview_histogram');
jest.mock('../../../../common/components/url_state/normalize_time_range');

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
            timeFrame="M"
            previewId={'test-preview-id'}
            spaceId={'default'}
            ruleType={'query'}
            index={['']}
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
            timeFrame="M"
            previewId={'test-preview-id'}
            spaceId={'default'}
            ruleType={'query'}
            index={['']}
          />
        </TestProviders>
      );

      expect(await wrapper.findByTestId('preview-histogram-loading')).toBeTruthy();
    });
  });
});
