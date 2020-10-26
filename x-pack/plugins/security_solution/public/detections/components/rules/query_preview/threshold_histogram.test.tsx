/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { TestProviders } from '../../../../common/mock';
import { PreviewThresholdQueryHistogram } from './threshold_histogram';

jest.mock('../../../../common/containers/use_global_time');

describe('PreviewThresholdQueryHistogram', () => {
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
          <PreviewThresholdQueryHistogram
            buckets={[]}
            inspect={{ dsl: [], response: [] }}
            refetch={jest.fn()}
            isLoading
          />
        </TestProviders>
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="queryPreviewLoading"]').exists()).toBeTruthy();
  });

  test('it configures buckets data', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <TestProviders>
          <PreviewThresholdQueryHistogram
            buckets={[
              { key: 'siem_kibana', doc_count: 400 },
              { key: 'bastion00.siem.estc.dev', doc_count: 80225 },
              { key: 'es02.siem.estc.dev', doc_count: 1228 },
            ]}
            inspect={{ dsl: [], response: [] }}
            refetch={jest.fn()}
            isLoading={false}
          />
        </TestProviders>
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="queryPreviewLoading"]').exists()).toBeFalsy();
    expect(
      wrapper.find('[data-test-subj="thresholdQueryPreviewHistogram"]').at(0).props().data
    ).toEqual([
      {
        key: 'hits',
        value: [
          { g: 'siem_kibana', x: 'siem_kibana', y: 400 },
          { g: 'bastion00.siem.estc.dev', x: 'bastion00.siem.estc.dev', y: 80225 },
          { g: 'es02.siem.estc.dev', x: 'es02.siem.estc.dev', y: 1228 },
        ],
      },
    ]);
  });

  test('it invokes setQuery with id, inspect, isLoading and refetch', async () => {
    const mockRefetch = jest.fn();

    mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <TestProviders>
          <PreviewThresholdQueryHistogram
            buckets={[
              { key: 'siem_kibana', doc_count: 400 },
              { key: 'bastion00.siem.estc.dev', doc_count: 80225 },
              { key: 'es02.siem.estc.dev', doc_count: 1228 },
            ]}
            inspect={{ dsl: ['some dsl'], response: ['query response'] }}
            refetch={mockRefetch}
            isLoading={false}
          />
        </TestProviders>
      </ThemeProvider>
    );

    expect(mockSetQuery).toHaveBeenCalledWith({
      id: 'queryPreviewThresholdHistogramQuery',
      inspect: { dsl: ['some dsl'], response: ['query response'] },
      loading: false,
      refetch: mockRefetch,
    });
  });
});
