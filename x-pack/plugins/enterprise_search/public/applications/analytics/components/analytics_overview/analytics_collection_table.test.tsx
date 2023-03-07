/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBasicTable } from '@elastic/eui';

import { AnalyticsCollection } from '../../../../../common/types/analytics';

import { AnalyticsCollectionTable } from './analytics_collection_table';

describe('AnalyticsCollectionTable', () => {
  const analyticsCollections: AnalyticsCollection[] = [
    {
      event_retention_day_length: 180,
      events_datastream: 'analytics-events-example',
      id: 'example',
      name: 'example',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders and provides navigation to the view detail pages', () => {
    const wrapper = shallow(
      <AnalyticsCollectionTable collections={analyticsCollections} isLoading={false} />
    );

    expect(wrapper.find(EuiBasicTable)).toHaveLength(1);

    const rows = wrapper.find(EuiBasicTable).prop('items');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject(analyticsCollections[0]);

    expect(wrapper.render().find('a').attr('href')).toContain('/collections/example/events');
  });
});
