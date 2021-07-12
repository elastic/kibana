/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiPanel, EuiText } from '@elastic/eui';

import { ManageLicenseButton } from '../../../shared/licensing';

import { LicenseCallout } from './';

describe('LicenseCallout', () => {
  it('renders when non-platinum or on trial', () => {
    setMockValues({
      hasPlatinumLicense: false,
      isTrial: true,
    });
    const wrapper = shallow(<LicenseCallout />);

    expect(wrapper.find(EuiPanel)).toHaveLength(1);
    expect(wrapper.find(EuiText)).toHaveLength(2);
    expect(wrapper.find(ManageLicenseButton)).toHaveLength(1);
  });

  it('does not render for platinum', () => {
    setMockValues({
      hasPlatinumLicense: true,
      isTrial: false,
    });
    const wrapper = shallow(<LicenseCallout />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
