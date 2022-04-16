/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiIcon } from '@elastic/eui';

import { AnalyticsSection } from '.';

describe('AnalyticsSection', () => {
  it('renders', () => {
    const wrapper = shallow(
      <AnalyticsSection title="Lorem ipsum" subtitle="Dolor sit amet.">
        <div data-test-subj="HelloWorld">Test</div>
      </AnalyticsSection>
    );

    expect(wrapper.find('h2').text()).toEqual('Lorem ipsum');
    expect(wrapper.find('p').text()).toEqual('Dolor sit amet.');
    expect(wrapper.find('[data-test-subj="HelloWorld"]')).toHaveLength(1);
  });

  it('renders an optional icon', () => {
    const wrapper = shallow(
      <AnalyticsSection title="Lorem ipsum" subtitle="Dolor sit amet." iconType="eye" />
    );

    expect(wrapper.find(EuiIcon).prop('type')).toEqual('eye');
  });
});
