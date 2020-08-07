/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { Layout } from './';

describe('Layout', () => {
  it('renders', () => {
    const wrapper = shallow(<Layout />);

    expect(wrapper.find('.enterpriseSearchLayout')).toHaveLength(1);
  });

  it('renders children', () => {
    const wrapper = shallow(
      <Layout>
        <div className="testing">Test</div>
      </Layout>
    );

    expect(wrapper.find('.enterpriseSearchLayout__body')).toHaveLength(1);
    expect(wrapper.find('.testing')).toHaveLength(1);
  });
});
