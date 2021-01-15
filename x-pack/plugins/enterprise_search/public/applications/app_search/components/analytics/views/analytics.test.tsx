/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { Analytics } from './';

describe('Analytics overview', () => {
  it('renders', () => {
    const wrapper = shallow(<Analytics />);

    expect(wrapper.isEmptyRender()).toBe(false); // TODO
  });
});
