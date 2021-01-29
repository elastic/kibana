/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { AnalyticsSection } from './';

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
});
