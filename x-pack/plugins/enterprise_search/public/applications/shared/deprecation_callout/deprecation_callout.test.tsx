/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EnterpriseSearchDeprecationCallout } from './deprecation_callout';

describe('EnterpriseSearchDeprecationCallout', () => {
  it('renders', () => {
    const dismissFxn = jest.fn();
    const wrapper = shallow(<EnterpriseSearchDeprecationCallout onDismissAction={dismissFxn} />);

    expect(wrapper.find('EuiCallOut')).toHaveLength(1);
    wrapper.find('EuiCallOut').simulate('dismiss');
    expect(dismissFxn).toHaveBeenCalledTimes(1);
  });

  it('dismisses via the link', () => {
    const dismissFxn = jest.fn();
    const wrapper = shallow(<EnterpriseSearchDeprecationCallout onDismissAction={dismissFxn} />);

    expect(wrapper.find('EuiLink')).toHaveLength(1);
    wrapper.find('EuiLink').simulate('click');
    expect(dismissFxn).toHaveBeenCalledTimes(1);
  });
});
