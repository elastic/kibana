/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { Chart } from '@elastic/charts';
import { EuiCard, EuiFlexGroup, EuiLoadingChart } from '@elastic/eui';

import { AnalyticsCollectionCard } from './analytics_collection_card';

const mockCollection = {
  event_retention_day_length: 180,
  events_datastream: 'analytics-events-example2',
  id: 'example2',
  name: 'example2',
};

describe('AnalyticsCollectionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loading charts', async () => {
    const wrapper = shallow(
      <AnalyticsCollectionCard
        collection={mockCollection}
        isLoading
        metric={null}
        secondaryMetric={null}
        data={[]}
      />
    );

    expect(wrapper.find(Chart)).toHaveLength(0);
    expect(wrapper.find(EuiCard).prop('footer')).toEqual(
      <EuiFlexGroup alignItems="center" justifyContent="center">
        <EuiLoadingChart size="m" />
      </EuiFlexGroup>
    );
  });

  it('render', async () => {
    setMockValues({});

    const mockMetric = 999;
    const secondaryMetric = 124;
    const wrapper = shallow(
      <AnalyticsCollectionCard
        collection={mockCollection}
        isLoading={false}
        metric={mockMetric}
        secondaryMetric={secondaryMetric}
        data={[[0, 0]]}
      />
    );

    expect(wrapper.find(EuiCard)).toHaveLength(1);
    expect(wrapper.find(Chart)).toHaveLength(1);
  });

  it('hide charts when data is not provided', async () => {
    setMockValues({});

    const mockMetric = 999;
    const secondaryMetric = 124;
    const wrapper = shallow(
      <AnalyticsCollectionCard
        collection={mockCollection}
        isLoading={false}
        metric={mockMetric}
        secondaryMetric={secondaryMetric}
        data={[]}
      />
    );

    expect(wrapper.find(EuiCard)).toHaveLength(1);
    expect(wrapper.find(Chart)).toHaveLength(0);
  });
});
