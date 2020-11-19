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
import { getAllBrowserFields } from '../../containers/source';

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
          dataTestSubj="testFieldComponent"
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
          dataTestSubj="testFieldComponent"
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

  test('it renders optional label if "showOptional" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <FieldCategorizedComponent
          placeholder="Placeholder text"
          browserFields={mockBrowserFields}
          selectedField={'agent.hostname'}
          isClearable={false}
          isDisabled={false}
          isLoading={false}
          dataTestSubj="testFieldComponent"
          onChange={jest.fn()}
          showOptional
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="fieldAutocompleteOptionalLabel"]').exists()).toBeTruthy();
  });

  test('it renders reset button if selected field does not match an option', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <FieldCategorizedComponent
          placeholder="Placeholder text"
          browserFields={mockBrowserFields}
          selectedField={'blah'}
          isClearable={false}
          isDisabled={false}
          isLoading={false}
          dataTestSubj="testFieldComponent"
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="fieldAutocompleteResetButton"]').exists()).toBeTruthy();
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
          dataTestSubj="testFieldComponent"
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
          dataTestSubj="testFieldComponent"
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
          dataTestSubj="testFieldComponent"
          onChange={mockOnChange}
        />
      </ThemeProvider>
    );

    ((wrapper.find(EuiComboBox).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'destination.address' }]);

    expect(mockOnChange).toHaveBeenCalledWith('destination.address');
  });

  test('it invokes "onError" when error exists', () => {
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
          dataTestSubj="testFieldComponent"
          onError={mockOnError}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(mockOnError).toHaveBeenCalledWith(i18n.TIMESTAMP_OVERRIDE_ERROR('blah'));
  });

  test('it does not filter browserFields if no "filterCallback" is passed', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <FieldCategorizedComponent
          placeholder="Placeholder text"
          browserFields={mockBrowserFields}
          selectedField={'agent.hostname'}
          isLoading={false}
          isDisabled={false}
          isClearable={false}
          dataTestSubj="testFieldComponent"
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    const comboBoxOptions: EuiComboBoxOptionOption[] = wrapper
      .find('[data-test-subj="fieldAutocompleteComboBox"]')
      .at(0)
      .prop('options');
    const fields = comboBoxOptions.flatMap(({ options }) => options);
    const mockFields = getAllBrowserFields(mockBrowserFields);
    expect(fields.length).toEqual(mockFields.length);
  });

  test('it does filter browserFields if "filterByIndexes" is passed', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <FieldCategorizedComponent
          placeholder="Placeholder text"
          browserFields={mockBrowserFields}
          selectedField={'agent.hostname'}
          isLoading={false}
          isDisabled={false}
          isClearable={false}
          filterByIndexes={['filebeat', 'auditbeat']}
          dataTestSubj="testFieldComponent"
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    const comboBoxOptions: EuiComboBoxOptionOption[] = wrapper
      .find('[data-test-subj="fieldAutocompleteComboBox"]')
      .at(0)
      .prop('options');
    const fields = comboBoxOptions.flatMap(({ options }) => options);
    const mockFields = getAllBrowserFields(mockBrowserFields);
    expect(fields.length).not.toEqual(mockFields.length);
  });
});
