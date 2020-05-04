/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiPageSideBar, EuiTabbedContent } from '@elastic/eui';

import { SetupGuide } from './';

describe('SetupGuide', () => {
  it('renders', () => {
    const wrapper = shallow(<SetupGuide />);

    expect(wrapper.find(EuiTabbedContent)).toHaveLength(1);
    expect(wrapper.find(EuiPageSideBar)).toHaveLength(1);
  });
});
