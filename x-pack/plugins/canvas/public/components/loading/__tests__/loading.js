/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import expect from '@kbn/expect';
import { shallow } from 'enzyme';
import { EuiLoadingSpinner, EuiIcon } from '@elastic/eui';
import { Loading } from '../loading';

describe('<Loading />', () => {
  it('uses EuiIcon by default', () => {
    const wrapper = shallow(<Loading />);
    expect(wrapper.contains(<EuiIcon />)).to.be.ok;
    expect(wrapper.contains(<EuiLoadingSpinner />)).to.not.be.ok;
  });

  it('uses EuiLoadingSpinner when animating', () => {
    const wrapper = shallow(<Loading animated />);
    expect(wrapper.contains(<EuiIcon />)).to.not.be.ok;
    expect(wrapper.contains(<EuiLoadingSpinner />)).to.be.ok;
  });
});
