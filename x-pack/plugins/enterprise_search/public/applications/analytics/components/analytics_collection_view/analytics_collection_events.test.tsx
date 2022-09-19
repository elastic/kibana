/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { AnalyticsCollection } from '../../../../../common/types/analytics';
import { EntSearchLogStream } from '../../../shared/log_stream';

import { AnalyticsCollectionEvents } from './analytics_collection_events';

describe('AnalyticsCollectionEvents', () => {
  const analyticsCollections: AnalyticsCollection = {
    event_retention_day_length: 180,
    id: '1',
    name: 'example',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const expectedQuery = '_index: logs-elastic_analytics.events-example*';

    const wrapper = shallow(<AnalyticsCollectionEvents collection={analyticsCollections} />);
    expect(wrapper.find(EntSearchLogStream).prop('query')).toEqual(expectedQuery);
  });
});
