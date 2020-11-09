/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { BuilderAndBadgeComponent } from './and_badge';

describe('BuilderAndBadgeComponent', () => {
  test('it renders exceptionItemEntryFirstRowAndBadge for very first exception item in builder', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <BuilderAndBadgeComponent entriesLength={2} exceptionItemIndex={0} />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionItemEntryFirstRowAndBadge"]').exists()
    ).toBeTruthy();
  });

  test('it renders exceptionItemEntryInvisibleAndBadge if "entriesLength" is 1 or less', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <BuilderAndBadgeComponent entriesLength={1} exceptionItemIndex={0} />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionItemEntryInvisibleAndBadge"]').exists()
    ).toBeTruthy();
  });

  test('it renders regular "and" badge if exception item is not the first one and includes more than one entry', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <BuilderAndBadgeComponent entriesLength={2} exceptionItemIndex={1} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionItemEntryAndBadge"]').exists()).toBeTruthy();
  });
});
