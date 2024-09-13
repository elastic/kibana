/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButtonGroup, EuiSuperDatePicker } from '@elastic/eui';

import { AnalyticsCollection } from '../../../../../common/types/analytics';

import { AnalyticsCollectionCardWithLens } from './analytics_collection_card/analytics_collection_card';
import { AnalyticsCollectionNotFound } from './analytics_collection_not_found';

import { AnalyticsCollectionTable } from './analytics_collection_table';

describe('AnalyticsCollectionTable', () => {
  const analyticsCollections: AnalyticsCollection[] = [
    {
      events_datastream: 'analytics-events-example',
      name: 'example',
    },
    {
      events_datastream: 'analytics-events-example2',
      name: 'example2',
    },
  ];
  const props = {
    collections: analyticsCollections,
    isSearching: false,
    onSearch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders cards', () => {
    const wrapper = shallow(<AnalyticsCollectionTable {...props} />);
    const collectionCards = wrapper.find(AnalyticsCollectionCardWithLens);

    expect(collectionCards).toHaveLength(analyticsCollections.length);
    expect(collectionCards.at(1).prop('collection')).toMatchObject(analyticsCollections[1]);
  });

  it('renders filters', () => {
    const buttonGroup = shallow(<AnalyticsCollectionTable {...props} />).find(EuiButtonGroup);

    expect(buttonGroup).toHaveLength(1);
    expect(buttonGroup.prop('options')).toHaveLength(4);
    expect(buttonGroup.prop('idSelected')).toEqual('Searches');
  });

  it('renders datePick', () => {
    const datePicker = shallow(<AnalyticsCollectionTable {...props} />).find(EuiSuperDatePicker);

    expect(datePicker).toHaveLength(1);
    expect(datePicker.prop('start')).toEqual('now-7d');
    expect(datePicker.prop('end')).toEqual('now');
  });

  it('renders not found page', () => {
    const wrapper = shallow(<AnalyticsCollectionTable {...props} collections={[]} />);

    expect(wrapper.find(AnalyticsCollectionNotFound)).toHaveLength(1);
  });
});
