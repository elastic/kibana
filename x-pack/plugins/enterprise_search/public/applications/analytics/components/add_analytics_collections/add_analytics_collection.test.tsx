/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { AddAnalyticsCollection } from './add_analytics_collection';
import { AddAnalyticsCollectionForm } from './add_analytics_collection_form';

describe('AddAnalyticsCollection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<AddAnalyticsCollection />);
    expect(wrapper.find(AddAnalyticsCollectionForm)).toHaveLength(1);
  });
});
