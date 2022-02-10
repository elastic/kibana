/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import * as i18n from '../rule_preview/translations';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { TestProviders } from '../../../../common/mock';
import { usePreviewHistogram } from './use_preview_histogram';

import { PreviewHistogram } from './preview_histogram';

jest.mock('../../../../common/containers/use_global_time');
jest.mock('./use_preview_histogram');

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

    expect(wrapper.find('[data-test-subj="preview-histogram-loading"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="header-section-subtitle"]').text()).toEqual(
      i18n.QUERY_PREVIEW_SUBTITLE_LOADING
    );
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

    const wrapper = mount(
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

    expect(wrapper.find('[data-test-subj="preview-histogram-loading"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="header-section-subtitle"]').text()).toEqual(
      i18n.QUERY_PREVIEW_TITLE(9154)
    );
    expect(
      (
        wrapper.find('[data-test-subj="preview-histogram-bar-chart"]').props() as {
          barChart: unknown;
        }
      ).barChart
    ).toEqual([
      {
        key: 'hits',
        value: [
          {
            g: 'All others',
            x: 1602247050000,
            y: 2314,
          },
          {
            g: 'All others',
            x: 1602247162500,
            y: 3471,
          },
          {
            g: 'All others',
            x: 1602247275000,
            y: 3369,
          },
        ],
      },
    ]);
  });
});
