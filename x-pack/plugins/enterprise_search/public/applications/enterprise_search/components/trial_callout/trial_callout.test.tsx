/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut } from '@elastic/eui';

import { TrialCallout } from './';

describe('TrialCallout', () => {
  it('renders when non-platinum or on trial', () => {
    setMockValues({ isTrial: true });
    const wrapper = shallow(<TrialCallout />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });

  it('does not render when not on trial', () => {
    setMockValues({ isTrial: false });
    const wrapper = shallow(<TrialCallout />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(0);
  });
});
