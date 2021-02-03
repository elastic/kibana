/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { CUSTOM_SERVICE_TYPE } from '../../../constants';
import { SourceSubNav } from './source_sub_nav';

import { SideNavLink } from '../../../../shared/layout';

describe('SourceSubNav', () => {
  it('renders empty when no group id present', () => {
    setMockValues({ contentSource: {} });
    const wrapper = shallow(<SourceSubNav />);

    expect(wrapper.find(SideNavLink)).toHaveLength(0);
  });

  it('renders nav items', () => {
    setMockValues({ contentSource: { id: '1' } });
    const wrapper = shallow(<SourceSubNav />);

    expect(wrapper.find(SideNavLink)).toHaveLength(3);
  });

  it('renders custom source nav items', () => {
    setMockValues({ contentSource: { id: '1', serviceType: CUSTOM_SERVICE_TYPE } });
    const wrapper = shallow(<SourceSubNav />);

    expect(wrapper.find(SideNavLink)).toHaveLength(5);
  });
});
