/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';
import { EuiButton } from '@elastic/eui';

import { CustomizationCallout } from './customization_callout';

describe('CustomizationCallout', () => {
  let wrapper: ShallowWrapper;
  const onClick = jest.fn();

  beforeAll(() => {
    wrapper = shallow(<CustomizationCallout onClick={onClick} />);
  });

  it('renders', () => {
    expect(wrapper.isEmptyRender()).toBe(false);
  });

  it('calls onClick param when the Customize button is clicked', () => {
    wrapper.find(EuiButton).simulate('click');
    expect(onClick).toHaveBeenCalled();
  });
});
