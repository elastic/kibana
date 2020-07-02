/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/shallow_usecontext.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiText, EuiFlexItem } from '@elastic/eui';

import { ViewContentHeader } from './';

const props = {
  title: 'Header',
};

describe('ViewContentHeader', () => {
  it('renders, without description', () => {
    const wrapper = shallow(<ViewContentHeader {...props} />);

    expect(wrapper.find('.view-content-header')).toHaveLength(1);
    expect(wrapper.find(EuiText)).toHaveLength(0);
  });

  it('shows description, when present', () => {
    const wrapper = shallow(<ViewContentHeader {...props} description="foo" />);

    expect(wrapper.find(EuiText)).toHaveLength(1);
  });

  it('shows action, when present', () => {
    const wrapper = shallow(<ViewContentHeader {...props} action={<div />} />);

    expect(wrapper.find(EuiFlexItem)).toHaveLength(2);
  });
});
