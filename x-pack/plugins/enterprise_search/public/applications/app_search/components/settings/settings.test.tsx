/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiPageContentBody } from '@elastic/eui';

import { Settings } from './settings';

describe('Settings', () => {
  it('renders', () => {
    const wrapper = shallow(<Settings />);
    expect(wrapper.find(EuiPageContentBody)).toHaveLength(1);
  });
});
