/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import * as i18n from './translations';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { TestProviders } from '../../../../common/mock';
import { PreviewCustomQueryHistogram } from './custom_histogram';

jest.mock('../../../../common/containers/use_global_time');

describe('PreviewCustomQueryHistogram', () => {
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
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <TestProviders>
          <PreviewCustomQueryHistogram
            to="2020-07-08T08:20:18.966Z"
            from="2020-07-07T08:20:18.966Z"
            data={[]}
            totalCount={0}
            inspect={{ dsl: [], response: [] }}
            refetch={jest.fn()}
            isLoading
          />
        </TestProviders>
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="queryPreviewLoading"]').exists()).toBeTruthy();
    expect(
      wrapper.find('[dataTestSubj="queryPreviewCustomHistogram"]').at(0).prop('subtitle')
    ).toEqual(i18n.QUERY_PREVIEW_SUBTITLE_LOADING);
  });

  test('it configures data and subtitle', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <TestProviders>
          <PreviewCustomQueryHistogram
            to="2020-07-08T08:20:18.966Z"
            from="2020-07-07T08:20:18.966Z"
            data={[
              { x: 1602247050000, y: 2314, g: 'All others' },
              { x: 1602247162500, y: 3471, g: 'All others' },
              { x: 1602247275000, y: 3369, g: 'All others' },
            ]}
            totalCount={9154}
            inspect={{ dsl: [], response: [] }}
            refetch={jest.fn()}
            isLoading={false}
          />
        </TestProviders>
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="queryPreviewLoading"]').exists()).toBeFalsy();
    expect(
      wrapper.find('[dataTestSubj="queryPreviewCustomHistogram"]').at(0).prop('subtitle')
    ).toEqual(i18n.QUERY_PREVIEW_TITLE(9154));
    expect(wrapper.find('[dataTestSubj="queryPreviewCustomHistogram"]').at(0).props().data).toEqual(
      [
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
      ]
    );
  });

  test('it invokes setQuery with id, inspect, isLoading and refetch', async () => {
    const mockRefetch = jest.fn();

    mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <TestProviders>
          <PreviewCustomQueryHistogram
            to="2020-07-08T08:20:18.966Z"
            from="2020-07-07T08:20:18.966Z"
            data={[]}
            totalCount={0}
            inspect={{ dsl: ['some dsl'], response: ['query response'] }}
            refetch={mockRefetch}
            isLoading={false}
          />
        </TestProviders>
      </ThemeProvider>
    );

    expect(mockSetQuery).toHaveBeenCalledWith({
      id: 'queryPreviewCustomHistogramQuery',
      inspect: { dsl: ['some dsl'], response: ['query response'] },
      loading: false,
      refetch: mockRefetch,
    });
  });
});
