/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { MetaEngineSchema } from './';

describe('MetaEngineSchema', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<MetaEngineSchema />);

    expect(wrapper.isEmptyRender()).toBe(false);
    // TODO: Check for schema components
  });
});
