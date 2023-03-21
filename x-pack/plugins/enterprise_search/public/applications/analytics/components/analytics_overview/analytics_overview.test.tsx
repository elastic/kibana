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

import { AnalyticsCollection } from '../../../../../common/types/analytics';

import { AnalyticsCollectionTable } from './analytics_collection_table';

import { AnalyticsOverview } from './analytics_overview';

const mockValues = {
  analyticsCollections: [
    {
      event_retention_day_length: 180,
      id: '1',
      name: 'Analytics Collection 1',
    },
  ] as AnalyticsCollection[],
  hasNoAnalyticsCollections: false,
};

const mockActions = {
  fetchAnalyticsCollections: jest.fn(),
};

describe('AnalyticsOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('empty state', () => {
    it('renders when analytics collections are empty on inital query', () => {
      setMockValues({
        ...mockValues,
        analyticsCollections: [],
        hasNoAnalyticsCollections: true,
      });
      setMockActions(mockActions);
      const wrapper = shallow(<AnalyticsOverview />);

      expect(mockActions.fetchAnalyticsCollections).toHaveBeenCalled();

      expect(wrapper.find(AnalyticsCollectionTable)).toHaveLength(0);
    });

    it('renders with Data', async () => {
      setMockValues(mockValues);
      setMockActions(mockActions);

      const wrapper = shallow(<AnalyticsOverview />);

      expect(wrapper.find(AnalyticsCollectionTable)).toHaveLength(1);
      expect(mockActions.fetchAnalyticsCollections).toHaveBeenCalled();
    });
  });
});
