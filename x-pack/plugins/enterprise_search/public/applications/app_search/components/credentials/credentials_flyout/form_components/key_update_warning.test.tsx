/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut } from '@elastic/eui';

import { FormKeyUpdateWarning } from '.';

describe('FormKeyUpdateWarning', () => {
  it('renders', () => {
    const wrapper = shallow(<FormKeyUpdateWarning />);
    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });
});
