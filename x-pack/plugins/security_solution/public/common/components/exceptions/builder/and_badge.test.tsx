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
        <BuilderAndBadgeComponent entriesLength={2} exceptionItemIndex={0} andLogicIncluded />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionItemEntryFirstRowAndBadge"]').exists()
    ).toBeTruthy();
  });

  test('it renders exceptionItemEntryInvisibleAndBadge if "andLogicIncluded" and "entriesLength" is 1 or less', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <BuilderAndBadgeComponent entriesLength={1} exceptionItemIndex={0} andLogicIncluded />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionItemEntryInvisibleAndBadge"]').exists()
    ).toBeTruthy();
  });

  test('it renders regular "and" badge if "entriesLength" is greater than 1,  "andLogicIncluded" is true, and "exceptionItemIndex" is not 0', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <BuilderAndBadgeComponent entriesLength={2} exceptionItemIndex={1} andLogicIncluded />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionItemEntryAndBadge"]').exists()).toBeTruthy();
  });

  test('it does not render a badge if "andLogicIncluded" is false', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <BuilderAndBadgeComponent
          entriesLength={2}
          exceptionItemIndex={1}
          andLogicIncluded={false}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionItemEntryAndBadge"]').exists()).toBeFalsy();
    expect(
      wrapper.find('[data-test-subj="exceptionItemEntryInvisibleAndBadge"]').exists()
    ).toBeFalsy();
    expect(
      wrapper.find('[data-test-subj="exceptionItemEntryFirstRowAndBadge"]').exists()
    ).toBeFalsy();
  });
});
