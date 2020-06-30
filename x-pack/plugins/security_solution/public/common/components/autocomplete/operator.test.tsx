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

import { getField } from '../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks.ts';
import { OperatorComponent } from './operator';
import { isOperator, isNotOperator } from './operators';

describe('OperatorComponent', () => {
  test('it renders disabled if "isDisabled" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <OperatorComponent
          placeholder="Placeholder text"
          selectedField={getField('machine.os.raw')}
          operator={isOperator}
          isDisabled={true}
          isLoading={false}
          isClearable={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find(`[data-test-subj="operatorAutocompleteComboBox"] input`).prop('disabled')
    ).toBeTruthy();
  });

  test('it renders loading if "isLoading" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <OperatorComponent
          placeholder="Placeholder text"
          selectedField={getField('machine.os.raw')}
          operator={isOperator}
          isDisabled={false}
          isLoading={true}
          isClearable={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );
    wrapper.find(`[data-test-subj="operatorAutocompleteComboBox"] button`).at(0).simulate('click');
    expect(
      wrapper
        .find(`EuiComboBoxOptionsList[data-test-subj="operatorAutocompleteComboBox-optionsList"]`)
        .prop('isLoading')
    ).toBeTruthy();
  });

  test('it allows user to clear values if "isClearable" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <OperatorComponent
          placeholder="Placeholder text"
          selectedField={getField('machine.os.raw')}
          operator={isOperator}
          isDisabled={false}
          isLoading={false}
          isClearable={true}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find(`button[data-test-subj="comboBoxClearButton"]`).exists()).toBeTruthy();
  });

  test('it displays "operatorOptions" if param is passed in', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <OperatorComponent
          placeholder="Placeholder text"
          selectedField={getField('machine.os.raw')}
          operator={isOperator}
          isDisabled={false}
          isLoading={false}
          isClearable={false}
          onChange={jest.fn()}
          operatorOptions={[isNotOperator]}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find(`[data-test-subj="operatorAutocompleteComboBox"]`).at(0).prop('options')
    ).toEqual([{ label: 'is not' }]);
  });

  test('it correctly displays selected operator', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <OperatorComponent
          placeholder="Placeholder text"
          selectedField={getField('machine.os.raw')}
          operator={isOperator}
          isDisabled={false}
          isLoading={false}
          isClearable={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find(`[data-test-subj="operatorAutocompleteComboBox"] EuiComboBoxPill`).at(0).text()
    ).toEqual('is');
  });

  test('it only displays subset of operators if field type is nested', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <OperatorComponent
          placeholder="Placeholder text"
          selectedField={{
            name: 'nestedField',
            type: 'nested',
            esTypes: ['text'],
            count: 0,
            scripted: false,
            searchable: true,
            aggregatable: false,
            readFromDocValues: false,
            subType: { nested: { path: 'nestedField' } },
          }}
          operator={isOperator}
          isDisabled={false}
          isLoading={false}
          isClearable={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find(`[data-test-subj="operatorAutocompleteComboBox"]`).at(0).prop('options')
    ).toEqual([{ label: 'is' }]);
  });

  test('it only displays subset of operators if field type is boolean', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <OperatorComponent
          placeholder="Placeholder text"
          selectedField={getField('ssl')}
          operator={isOperator}
          isDisabled={false}
          isLoading={false}
          isClearable={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find(`[data-test-subj="operatorAutocompleteComboBox"]`).at(0).prop('options')
    ).toEqual([
      { label: 'is' },
      { label: 'is not' },
      { label: 'exists' },
      { label: 'does not exist' },
    ]);
  });

  test('it invokes "onChange" when option selected', () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <OperatorComponent
          placeholder="Placeholder text"
          selectedField={getField('machine.os.raw')}
          operator={isOperator}
          isDisabled={false}
          isLoading={false}
          isClearable={false}
          onChange={mockOnChange}
        />
      </ThemeProvider>
    );

    ((wrapper.find(EuiComboBox).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'is not' }]);

    expect(mockOnChange).toHaveBeenCalledWith([
      { message: 'is not', operator: 'excluded', type: 'match', value: 'is_not' },
    ]);
  });
});
