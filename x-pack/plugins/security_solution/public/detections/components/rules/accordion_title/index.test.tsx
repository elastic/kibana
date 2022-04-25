/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { AccordionTitle } from '.';

describe('AccordionTitle', () => {
  it('renders correctly', () => {
    const wrapper = shallow(<AccordionTitle name="name" title="title" type="valid" />);

    expect(wrapper.find('h6').text()).toContain('title');
  });
});
