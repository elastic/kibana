/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EuiLink, EuiText } from '@elastic/eui';

import { LicenseCallout } from '.';

describe('LicenseCallout', () => {
  it('renders', () => {
    const wrapper = shallow(<LicenseCallout message="foo" />);

    expect(wrapper.find(EuiLink)).toHaveLength(1);
    expect(wrapper.find(EuiText)).toHaveLength(1);
  });
});
