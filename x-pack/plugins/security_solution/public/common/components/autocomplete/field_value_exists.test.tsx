/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { AutocompleteFieldExistsComponent } from './field_value_exists';

describe('AutocompleteFieldExistsComponent', () => {
  test('it renders field disabled', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AutocompleteFieldExistsComponent placeholder="Placeholder text" />
      </ThemeProvider>
    );

    expect(
      wrapper
        .find(`[data-test-subj="valuesAutocompleteComboBox existsComboxBox"] input`)
        .prop('disabled')
    ).toBeTruthy();
  });
});
