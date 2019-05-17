/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { HeaderPanel } from './index';

describe('rendering', () => {
  test('renders correctly', () => {
    const wrapper = shallow(
      <HeaderPanel subtitle="My Test Subtitle" title="My Test Title" tooltip="My test tooltip.">
        <p>My test supplement.</p>
      </HeaderPanel>
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
