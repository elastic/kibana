/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { CreateAnalyticsButton } from './create_analytics_button';

jest.mock('../../../../../../../shared_imports');

describe('Data Frame Analytics: <CreateAnalyticsButton />', () => {
  test('Minimal initialization', () => {
    const wrapper = mount(
      <CreateAnalyticsButton isDisabled={false} navigateToSourceSelection={jest.fn()} />
    );

    expect(wrapper.find('EuiButton').text()).toBe('Create job');
  });
});
