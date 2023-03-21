/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/shallow_useeffect.mock';

import React from 'react';

import { EuiCodeBlock } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { AnalyticsCollection } from '../../../../../../common/types/analytics';

import { AnalyticsCollectionIntegrate } from './analytics_collection_integrate';

describe('AnalyticsCollectionIntegrate', () => {
  const analyticsCollections: AnalyticsCollection = {
    events_datastream: 'analytics-events-example',
    name: 'example',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = mountWithIntl(
      <AnalyticsCollectionIntegrate collection={analyticsCollections} />
    );
    expect(wrapper.find(EuiCodeBlock)).toHaveLength(3);
    wrapper.find('[data-test-subj="searchuiEmbed"]').at(0).simulate('click');
    expect(wrapper.find(EuiCodeBlock)).toHaveLength(3);
    wrapper.find('[data-test-subj="javascriptClientEmbed"]').at(0).simulate('click');
    expect(wrapper.find(EuiCodeBlock)).toHaveLength(5);
  });

  it('check value of analyticsDNSUrl & webClientSrc', () => {
    const wrapper = mountWithIntl(
      <AnalyticsCollectionIntegrate collection={analyticsCollections} />
    );
    expect(wrapper.find(EuiCodeBlock).at(0).text()).toContain(
      'data-dsn="/api/analytics/collections/example"'
    );
    expect(wrapper.find(EuiCodeBlock).at(0).text()).toContain('src="/analytics.js"');
  });
});
