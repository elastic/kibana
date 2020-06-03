/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { AndOrBadge } from './';

describe('AndOrBadge', () => {
  test('it renders top and bottom antenna bars when "includeAntennas" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AndOrBadge includeAntennas type="and" />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="and-or-badge"]').at(0).text()).toEqual('AND');
    expect(wrapper.find('.topAndOrBadgeAntenna[data-test-subj="and-or-badge-bar"]')).toHaveLength(
      1
    );
    expect(
      wrapper.find('.bottomAndOrBadgeAntenna[data-test-subj="and-or-badge-bar"]')
    ).toHaveLength(1);
  });

  test('it renders "and" when "type" is "and"', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AndOrBadge type="and" />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="and-or-badge"]').at(0).text()).toEqual('AND');
    expect(wrapper.find('EuiFlexItem[data-test-subj="and-or-badge-bar"]')).toHaveLength(0);
  });

  test('it renders "or" when "type" is "or"', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AndOrBadge type="or" />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="and-or-badge"]').at(0).text()).toEqual('OR');
    expect(wrapper.find('EuiFlexItem[data-test-subj="and-or-badge-bar"]')).toHaveLength(0);
  });
});
