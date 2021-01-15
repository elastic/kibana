/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EngineIcon } from './engine_icon';
import { MetaEngineIcon } from './meta_engine_icon';

describe('Engines icons', () => {
  it('renders an engine icon', () => {
    const wrapper = shallow(<EngineIcon />);
    expect(wrapper.hasClass('engineIcon')).toBe(true);
  });

  it('renders a meta engine icon', () => {
    const wrapper = shallow(<MetaEngineIcon />);
    expect(wrapper.hasClass('engineIcon')).toBe(true);
  });
});
