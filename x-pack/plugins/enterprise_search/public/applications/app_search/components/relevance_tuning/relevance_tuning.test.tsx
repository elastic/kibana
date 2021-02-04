/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { RelevanceTuning } from './relevance_tuning';

describe('RelevanceTuning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<RelevanceTuning engineBreadcrumb={['test']} />);
    expect(wrapper.isEmptyRender()).toBe(false);
  });
});
