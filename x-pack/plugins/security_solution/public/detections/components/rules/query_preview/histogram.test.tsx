/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../../common/mock';
import { PreviewHistogram } from './histogram';
import { getHistogramConfig } from './helpers';

describe('PreviewHistogram', () => {
  test('it renders loading icon if "isLoading" is true', () => {
    const wrapper = mount(
      <TestProviders>
        <PreviewHistogram
          id="previewHistogramId"
          data={[]}
          barConfig={{}}
          title="Hits"
          subtitle="500 hits"
          disclaimer="be ware"
          isLoading
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="queryPreviewLoading"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="sharedPreviewQueryHistogram"]').exists()).toBeFalsy();
  });

  test('it renders chart if "isLoading" is true', () => {
    const wrapper = mount(
      <TestProviders>
        <PreviewHistogram
          id="previewHistogramId"
          data={[
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
          ]}
          barConfig={getHistogramConfig('2020-07-08T08:20:18.966Z', '2020-07-07T08:20:18.966Z')}
          title="Hits"
          subtitle="500 hits"
          disclaimer="be ware"
          isLoading={false}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="queryPreviewLoading"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="sharedPreviewQueryHistogram"]').exists()).toBeTruthy();
  });
});
