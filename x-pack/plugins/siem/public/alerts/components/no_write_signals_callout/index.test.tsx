/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { NoWriteSignalsCallOut } from './index';

describe('no_write_signals_callout', () => {
  it('renders correctly', () => {
    const wrapper = shallow(<NoWriteSignalsCallOut />);

    expect(wrapper.find('EuiCallOut')).toBeTruthy();
  });
});
