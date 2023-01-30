/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';
import { mockUseParams } from '../../../__mocks__/react_router';

import React from 'react';

import { shallow } from 'enzyme';

import { AnalyticsCollection } from '../../../../../common/types/analytics';

import { AnalyticsCollectionIntegrate } from './analytics_collection_integrate/analytics_collection_integrate';
import { AnalyticsCollectionSettings } from './analytics_collection_settings';

import { AnalyticsCollectionView } from './analytics_collection_view';

const mockValues = {
  analyticsCollection: {
    event_retention_day_length: 180,
    id: '1',
    name: 'Analytics Collection 1',
  } as AnalyticsCollection,
};

const mockActions = {
  fetchAnalyticsCollection: jest.fn(),
};

describe('AnalyticsOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseParams.mockReturnValue({ name: '1', section: 'settings' });
  });

  describe('empty state', () => {
    it('renders when analytics collection is empty on inital query', () => {
      setMockValues({
        ...mockValues,
        analyticsCollection: null,
      });
      setMockActions(mockActions);
      const wrapper = shallow(<AnalyticsCollectionView />);

      expect(mockActions.fetchAnalyticsCollection).toHaveBeenCalled();

      expect(wrapper.find(AnalyticsCollectionSettings)).toHaveLength(0);
      expect(wrapper.find(AnalyticsCollectionIntegrate)).toHaveLength(0);
    });

    it('renders with Data', async () => {
      setMockValues(mockValues);
      setMockActions(mockActions);

      const wrapper = shallow(<AnalyticsCollectionView />);

      expect(wrapper.find(AnalyticsCollectionSettings)).toHaveLength(1);
      expect(mockActions.fetchAnalyticsCollection).toHaveBeenCalled();
    });

    it('sends correct telemetry page name for selected tab', async () => {
      setMockValues(mockValues);
      setMockActions(mockActions);

      const wrapper = shallow(<AnalyticsCollectionView />);

      expect(wrapper.prop('pageViewTelemetry')).toBe('View Analytics Collection - settings');
    });
  });
});
