/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { SetWorkplaceSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SetupGuide as SetupGuideLayout } from '../../../shared/setup_guide';
import { SetupGuide } from './';

describe('SetupGuide', () => {
  it('renders', () => {
    const wrapper = shallow(<SetupGuide />);

    expect(wrapper.find(SetupGuideLayout)).toHaveLength(1);
    expect(wrapper.find(SetPageChrome)).toHaveLength(1);
  });
});
