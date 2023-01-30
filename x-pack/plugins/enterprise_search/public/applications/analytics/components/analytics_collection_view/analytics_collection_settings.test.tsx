/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton, EuiPanel } from '@elastic/eui';

import { AnalyticsCollection } from '../../../../../common/types/analytics';

import { AnalyticsCollectionSettings } from './analytics_collection_settings';

const mockActions = {
  deleteAnalyticsCollection: jest.fn(),
  setNameValue: jest.fn(),
};

const analyticsCollection: AnalyticsCollection = {
  event_retention_day_length: 180,
  events_datastream: 'analytics-events-foo',
  id: 'example',
  name: 'example',
};

describe('AnalyticsCollectionSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    setMockActions(mockActions);

    const wrapper = shallow(<AnalyticsCollectionSettings collection={analyticsCollection} />);
    expect(wrapper.find(EuiPanel)).toHaveLength(2);
  });

  it('deletes analytics collection when delete is clicked', () => {
    setMockActions(mockActions);

    const wrapper = shallow(<AnalyticsCollectionSettings collection={analyticsCollection} />);

    wrapper.find(EuiButton).simulate('click', { preventDefault: jest.fn() });
    expect(mockActions.deleteAnalyticsCollection).toHaveBeenCalled();
  });
});
