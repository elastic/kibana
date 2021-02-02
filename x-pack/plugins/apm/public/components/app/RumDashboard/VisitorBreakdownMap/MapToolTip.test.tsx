/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { render, shallow } from 'enzyme';
import React from 'react';

import { MapToolTip } from './MapToolTip';

describe('Map Tooltip', () => {
  test('it shallow renders', () => {
    const wrapper = shallow(<MapToolTip />);

    expect(wrapper).toMatchSnapshot();
  });

  test('it renders', () => {
    const wrapper = render(<MapToolTip />);

    expect(wrapper).toMatchSnapshot();
  });
});
