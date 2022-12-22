/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiEmptyPrompt } from '@elastic/eui';

import { AnalyticsCollection } from '../../../../../common/types/analytics';
import { EntSearchLogStream } from '../../../shared/log_stream';

import { AnalyticsCollectionEvents } from './analytics_collection_events';

describe('AnalyticsCollectionEvents', () => {
  const analyticsCollection: AnalyticsCollection = {
    event_retention_day_length: 180,
    events_datastream: 'logs-elastic_analytics.events-example',
    id: '1',
    name: 'example',
  };

  const mockActions = {
    analyticsEventsIndexExists: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    setMockActions(mockActions);
  });

  it('renders', () => {
    setMockValues({
      isPresent: true,
      isLoading: false,
    });
    const expectedQuery = '_index: logs-elastic_analytics.events-example';

    const wrapper = shallow(<AnalyticsCollectionEvents collection={analyticsCollection} />);
    expect(wrapper.find(EntSearchLogStream).prop('query')).toEqual(expectedQuery);
  });

  describe('empty state', () => {
    it('renders when analytics events index is not present', () => {
      setMockValues({
        isPresent: false,
      });

      const wrapper = shallow(<AnalyticsCollectionEvents collection={analyticsCollection} />);

      expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    });

    it('renders when analytics events index check is not performed yet', () => {
      setMockValues({
        isLoading: true,
      });

      const wrapper = shallow(<AnalyticsCollectionEvents collection={analyticsCollection} />);

      expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    });
  });
});
