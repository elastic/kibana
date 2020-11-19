/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import * as i18n from './translations';
import { FieldCategorizedComponent } from './field_categorized';
import { mockBrowserFields } from '../../containers/source/mock';

describe('FieldCategorizedComponent', () => {
  test('it renders disabled if "isDisabled" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <FieldCategorizedComponent
          placeholder="Placeholder text"
          browserFields={mockBrowserFields}
          selectedField={'agent.hostname'}
          isLoading={false}
          isClearable={false}
          isDisabled
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find(`[data-test-subj="fieldAutocompleteComboBox"] input`).prop('disabled')
    ).toBeTruthy();
    expect(wrapper.find('[data-test-subj="fieldAutocompleteOptionalLabel"]').exists()).toBeFalsy();
  });

  test('it renders loading if "isLoading" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <FieldCategorizedComponent
          placeholder="Placeholder text"
          browserFields={mockBrowserFields}
          selectedField={'agent.hostname'}
          isClearable={false}
          isDisabled={false}
          onChange={jest.fn()}
          isLoading
        />
      </ThemeProvider>
    );
    wrapper.find('[data-test-subj="fieldAutocompleteComboBox"] button').at(0).simulate('click');

    expect(
      wrapper
        .find(`EuiComboBoxOptionsList[data-test-subj="fieldAutocompleteComboBox-optionsList"]`)
        .prop('isLoading')
    ).toBeTruthy();
    expect(wrapper.find('[data-test-subj="fieldAutocompleteOptionalLabel"]').exists()).toBeFalsy();
  });

  test('it allows user to clear values if "isClearable" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <FieldCategorizedComponent
          placeholder="Placeholder text"
          browserFields={mockBrowserFields}
          selectedField={'agent.hostname'}
          isLoading={false}
          isDisabled={false}
          onChange={jest.fn()}
          isClearable
        />
      </ThemeProvider>
    );

    expect(
      wrapper
        .find(`[data-test-subj="comboBoxInput"]`)
        .hasClass('euiComboBox__inputWrap-isClearable')
    ).toBeTruthy();
  });

  test('it correctly displays selected field', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <FieldCategorizedComponent
          placeholder="Placeholder text"
          browserFields={mockBrowserFields}
          selectedField={'agent.hostname'}
          isLoading={false}
          isDisabled={false}
          isClearable={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find(`[data-test-subj="fieldAutocompleteComboBox"] EuiComboBoxPill`).at(0).text()
    ).toEqual('agent.hostname');
  });

  test('it invokes "onChange" when option selected', () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <FieldCategorizedComponent
          placeholder="Placeholder text"
          browserFields={mockBrowserFields}
          selectedField={'agent.hostname'}
          isLoading={false}
          isDisabled={false}
          isClearable={false}
          onChange={mockOnChange}
        />
      </ThemeProvider>
    );

    ((wrapper.find(EuiComboBox).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'destination.address' }]);

    expect(mockOnChange).toHaveBeenCalledWith('destination.address');
  });

  test('it invokes "onError" when passed in selected value is not found in available options', () => {
    const mockOnError = jest.fn();
    mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <FieldCategorizedComponent
          placeholder="Placeholder text"
          browserFields={mockBrowserFields}
          selectedField={'blah'}
          isLoading={false}
          isDisabled={false}
          isClearable={false}
          onError={mockOnError}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(mockOnError).toHaveBeenCalledWith(i18n.TIMESTAMP_OVERRIDE_ERROR('blah'));
  });
});
