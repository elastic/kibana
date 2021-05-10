/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiPageHeader, EuiButton } from '@elastic/eui';

import { Schema } from './';

describe('Schema', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<Schema />);

    expect(wrapper.isEmptyRender()).toBe(false);
    // TODO: Check for schema components
  });

  it('renders page action buttons', () => {
    const wrapper = shallow(<Schema />)
      .find(EuiPageHeader)
      .dive()
      .children()
      .dive();

    expect(wrapper.find(EuiButton)).toHaveLength(2);
    // TODO: Expect click actions
  });
});
