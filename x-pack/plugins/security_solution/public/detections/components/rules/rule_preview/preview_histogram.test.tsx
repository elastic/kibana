/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import * as i18n from '../rule_preview/translations';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { TestProviders } from '../../../../common/mock';
import { usePreviewHistogram } from './use_preview_histogram';

import { PreviewHistogram } from './preview_histogram';
import { ALL_VALUES_ZEROS_TITLE } from '../../../../common/components/charts/translation';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/containers/use_global_time');
jest.mock('./use_preview_histogram');
jest.mock('../../../../common/components/url_state/normalize_time_range.ts');

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

    test('it renders an empty histogram and table', () => {
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

      expect(wrapper.findByText('hello grid')).toBeTruthy();
      expect(wrapper.findByText(ALL_VALUES_ZEROS_TITLE)).toBeTruthy();
    });
  });

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

    expect(wrapper.findByTestId('preview-histogram-loading')).toBeTruthy();
    expect(wrapper.findByText(i18n.QUERY_PREVIEW_SUBTITLE_LOADING)).toBeTruthy();
  });

  test('it configures data and subtitle', () => {
    (usePreviewHistogram as jest.Mock).mockReturnValue([
      false,
      {
        inspect: { dsl: [], response: [] },
        totalCount: 9154,
        refetch: jest.fn(),
        data: [
          { x: 1602247050000, y: 2314, g: 'All others' },
          { x: 1602247162500, y: 3471, g: 'All others' },
          { x: 1602247275000, y: 3369, g: 'All others' },
        ],
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

    expect(wrapper.queryByTestId('preview-histogram-loading')).toBeFalsy();
    expect(wrapper.findByText(i18n.QUERY_PREVIEW_TITLE(9154))).toBeTruthy();
  });
});
