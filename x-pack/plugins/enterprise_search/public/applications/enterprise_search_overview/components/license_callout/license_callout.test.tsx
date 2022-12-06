/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiPanel } from '@elastic/eui';

import { LicenseCallout } from '.';

// TODO: Remove this license callout code completely (eventually)
// for now, the test is merely updated to reflect that it shouldn't
// render at all
describe('LicenseCallout', () => {
  it('never renders a license callout', () => {
    setMockValues({
      hasPlatinumLicense: false,
      isTrial: true,
    });
    const wrapper = shallow(<LicenseCallout />);

    expect(wrapper.find(EuiPanel)).toHaveLength(0);
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
