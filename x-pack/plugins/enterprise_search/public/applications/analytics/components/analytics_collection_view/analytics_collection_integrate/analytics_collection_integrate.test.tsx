/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/shallow_useeffect.mock';
import '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCodeBlock, EuiSteps } from '@elastic/eui';

import { AnalyticsCollection } from '../../../../../../common/types/analytics';

import { AnalyticsCollectionIntegrateView } from './analytics_collection_integrate_view';

jest.mock('../../../../shared/enterprise_search_url', () => ({
  getEnterpriseSearchUrl: () => 'http://localhost:3002',
}));

describe('AnalyticsCollectionIntegrate', () => {
  const analyticsCollections: AnalyticsCollection = {
    events_datastream: 'analytics-events-example',
    name: 'example',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(
      <AnalyticsCollectionIntegrateView analyticsCollection={analyticsCollections} />
    );
    expect(wrapper.find(EuiSteps).dive().find(EuiCodeBlock)).toHaveLength(4);
    wrapper.find('[data-test-subj="searchuiEmbed"]').at(0).simulate('click');
    expect(wrapper.find(EuiSteps).dive().find(EuiCodeBlock)).toHaveLength(3);
    wrapper.find('[data-test-subj="javascriptClientEmbed"]').at(0).simulate('click');
    expect(wrapper.find(EuiSteps).dive().find(EuiCodeBlock)).toHaveLength(6);
  });

  it('check value of config & webClientSrc', () => {
    const wrapper = shallow(
      <AnalyticsCollectionIntegrateView analyticsCollection={analyticsCollections} />
    );
    expect(wrapper.find(EuiSteps).dive().find(EuiCodeBlock).at(1).dive().text()).toContain(
      'https://cdn.jsdelivr.net/npm/@elastic/behavioral-analytics-browser-tracker@2'
    );

    expect(wrapper.find(EuiSteps).dive().find(EuiCodeBlock).at(2).dive().text())
      .toMatchInlineSnapshot(`
      "<script type=\\"text/javascript\\">
      window.elasticAnalytics.createTracker({
        endpoint: \\"https://localhost:9200\\",
        collectionName: \\"example\\",
        apiKey: \\"########\\",
        // Optional: sampling rate percentage: 0-1, 0 = no events, 1 = all events
        // sampling: 1,
      });
      </script>"
    `);
  });
});
