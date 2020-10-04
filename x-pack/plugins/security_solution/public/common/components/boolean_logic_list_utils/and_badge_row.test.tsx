/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { AndBadgeRowComponent } from './and_badge_row';

describe('AndBadgeRowComponent', () => {
  test('it renders entryItemFirstRowAndBadge for very first exception item in builder', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AndBadgeRowComponent entriesLength={2} entryItemIndex={0} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="entryItemFirstRowAndBadge"]').exists()).toBeTruthy();
  });

  test('it renders entryItemInvisibleAndBadge if "entriesLength" is 1 or less', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AndBadgeRowComponent entriesLength={1} entryItemIndex={0} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="entryItemInvisibleAndBadge"]').exists()).toBeTruthy();
  });

  test('it renders regular "and" badge if exception item is not the first one and includes more than one entry', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AndBadgeRowComponent entriesLength={2} entryItemIndex={1} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="entryItemAndBadge"]').exists()).toBeTruthy();
  });
});
