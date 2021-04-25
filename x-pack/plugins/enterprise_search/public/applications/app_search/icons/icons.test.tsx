/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { CursorIcon } from './cursor_icon';
import { EngineIcon } from './engine_icon';
import { MetaEngineIcon } from './meta_engine_icon';

describe('shared App Search icons', () => {
  it('renders a cursor icon', () => {
    const wrapper = shallow(<CursorIcon />);
    expect(wrapper.hasClass('euiIcon')).toBe(true);
  });

  it('renders an engine icon', () => {
    const wrapper = shallow(<EngineIcon />);
    expect(wrapper.hasClass('euiIcon')).toBe(true);
  });

  it('renders a meta engine icon', () => {
    const wrapper = shallow(<MetaEngineIcon />);
    expect(wrapper.hasClass('euiIcon')).toBe(true);
  });
});
