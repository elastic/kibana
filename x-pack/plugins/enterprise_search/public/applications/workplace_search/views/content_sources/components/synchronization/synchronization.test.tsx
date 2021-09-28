/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiLink, EuiCallOut, EuiSwitch } from '@elastic/eui';

import { Synchronization } from './synchronization';

describe('Synchronization', () => {
  it('renders when config enabled', () => {
    setMockValues({ contentSource: { isSyncConfigEnabled: true } });
    const wrapper = shallow(<Synchronization />);

    expect(wrapper.find(EuiLink)).toHaveLength(1);
    expect(wrapper.find(EuiSwitch)).toHaveLength(1);
  });

  it('renders when config disabled', () => {
    setMockValues({ contentSource: { isSyncConfigEnabled: false } });
    const wrapper = shallow(<Synchronization />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });
});
