/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiFlyoutBody } from '@elastic/eui';

import { CredentialsFlyoutBody } from './body';

describe('CredentialsFlyoutBody', () => {
  it('renders', () => {
    const wrapper = shallow(<CredentialsFlyoutBody />);
    expect(wrapper.find(EuiFlyoutBody)).toHaveLength(1);
  });
});
