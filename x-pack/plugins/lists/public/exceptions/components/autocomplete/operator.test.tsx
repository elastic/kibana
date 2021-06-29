/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { isNotOperator, isOperator } from '@kbn/securitysolution-list-utils';

import { getField } from '../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks';

import { OperatorComponent } from './operator';

describe('OperatorComponent', () => {
  test('it renders disabled if "isDisabled" is true', () => {
    const wrapper = mount(
      <OperatorComponent
        isClearable={false}
        isDisabled={true}
        isLoading={false}
        onChange={jest.fn()}
        operator={isOperator}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );

    expect(
      wrapper.find(`[data-test-subj="operatorAutocompleteComboBox"] input`).prop('disabled')
    ).toBeTruthy();
  });

  test('it renders loading if "isLoading" is true', () => {
    const wrapper = mount(
      <OperatorComponent
        isClearable={false}
        isDisabled={false}
        isLoading={true}
        onChange={jest.fn()}
        operator={isOperator}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
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
      <OperatorComponent
        isClearable={true}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        operator={isOperator}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );

    expect(wrapper.find(`button[data-test-subj="comboBoxClearButton"]`).exists()).toBeTruthy();
  });

  test('it displays "operatorOptions" if param is passed in with items', () => {
    const wrapper = mount(
      <OperatorComponent
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        operator={isOperator}
        operatorOptions={[isNotOperator]}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );

    expect(
      wrapper.find(`[data-test-subj="operatorAutocompleteComboBox"]`).at(0).prop('options')
    ).toEqual([{ label: 'is not' }]);
  });

  test('it does not display "operatorOptions" if param is passed in with no items', () => {
    const wrapper = mount(
      <OperatorComponent
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        operator={isOperator}
        operatorOptions={[]}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );

    expect(
      wrapper.find(`[data-test-subj="operatorAutocompleteComboBox"]`).at(0).prop('options')
    ).toEqual([
      {
        label: 'is',
      },
      {
        label: 'is not',
      },
      {
        label: 'is one of',
      },
      {
        label: 'is not one of',
      },
      {
        label: 'exists',
      },
      {
        label: 'does not exist',
      },
      {
        label: 'is in list',
      },
      {
        label: 'is not in list',
      },
    ]);
  });

  test('it correctly displays selected operator', () => {
    const wrapper = mount(
      <OperatorComponent
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        operator={isOperator}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );

    expect(
      wrapper.find(`[data-test-subj="operatorAutocompleteComboBox"] EuiComboBoxPill`).at(0).text()
    ).toEqual('is');
  });

  test('it only displays subset of operators if field type is nested', () => {
    const wrapper = mount(
      <OperatorComponent
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        operator={isOperator}
        placeholder="Placeholder text"
        selectedField={{
          aggregatable: false,
          count: 0,
          esTypes: ['text'],
          name: 'nestedField',
          readFromDocValues: false,
          scripted: false,
          searchable: true,
          subType: { nested: { path: 'nestedField' } },
          type: 'nested',
        }}
      />
    );

    expect(
      wrapper.find(`[data-test-subj="operatorAutocompleteComboBox"]`).at(0).prop('options')
    ).toEqual([{ label: 'is' }]);
  });

  test('it only displays subset of operators if field type is boolean', () => {
    const wrapper = mount(
      <OperatorComponent
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        operator={isOperator}
        placeholder="Placeholder text"
        selectedField={getField('ssl')}
      />
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
      <OperatorComponent
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={mockOnChange}
        operator={isOperator}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );

    ((wrapper.find(EuiComboBox).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'is not' }]);

    expect(mockOnChange).toHaveBeenCalledWith([
      { message: 'is not', operator: 'excluded', type: 'match', value: 'is_not' },
    ]);
  });
});
