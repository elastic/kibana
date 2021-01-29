/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiSteps, EuiLink } from '@elastic/eui';

import { mountWithIntl } from '../../__mocks__';

import { SetupInstructions } from './instructions';

describe('SetupInstructions', () => {
  it('renders', () => {
    const wrapper = shallow(<SetupInstructions productName="Workplace Search" />);
    expect(wrapper.find(EuiSteps)).toHaveLength(1);
  });

  it('renders with auth links', () => {
    const wrapper = mountWithIntl(
      <SetupInstructions
        productName="Enterprise Search"
        standardAuthLink="http://foo.com"
        elasticsearchNativeAuthLink="http://bar.com"
      />
    );

    expect(wrapper.find(EuiLink).first().prop('href')).toEqual('http://bar.com');
    expect(wrapper.find(EuiLink).last().prop('href')).toEqual('http://foo.com');
  });
});
