/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactWrapper, mount } from 'enzyme';
import React from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import { BuilderEntryItem } from './entry_item';
import {
  isOperator,
  isNotOperator,
  isOneOfOperator,
  isNotOneOfOperator,
  isInListOperator,
  isNotInListOperator,
  existsOperator,
  doesNotExistOperator,
} from '../../autocomplete/operators';
import {
  fields,
  getField,
} from '../../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks';
import { getFoundListSchemaMock } from '../../../../../../lists/common/schemas/response/found_list_schema.mock';
import { getEmptyValue } from '../../empty_value';

// mock out lists hook
const mockStart = jest.fn();
const mockResult = getFoundListSchemaMock();
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../lists_plugin_deps', () => {
  const originalModule = jest.requireActual('../../../../lists_plugin_deps');

  return {
    ...originalModule,
    useFindLists: () => ({
      loading: false,
      start: mockStart.mockReturnValue(mockResult),
      result: mockResult,
      error: undefined,
    }),
  };
});

describe('BuilderEntryItem', () => {
  let wrapper: ReactWrapper;

  afterEach(() => {
    jest.clearAllMocks();
    wrapper.unmount();
  });

  test('it renders field labels if "showLabel" is "true"', () => {
    wrapper = mount(
      <BuilderEntryItem
        entry={{
          field: undefined,
          operator: isOperator,
          value: undefined,
          nested: undefined,
          parent: undefined,
          entryIndex: 0,
          correspondingKeywordField: undefined,
        }}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={true}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryFieldFormRow"]')).not.toEqual(0);
  });

  test('it renders field values correctly when operator is "isOperator"', () => {
    wrapper = mount(
      <BuilderEntryItem
        entry={{
          field: getField('ip'),
          operator: isOperator,
          value: '1234',
          nested: undefined,
          parent: undefined,
          entryIndex: 0,
          correspondingKeywordField: undefined,
        }}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').text()).toEqual('ip');
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryOperator"]').text()).toEqual('is');
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryFieldMatch"]').text()).toEqual(
      '1234'
    );
  });

  test('it renders field values correctly when operator is "isNotOperator"', () => {
    wrapper = mount(
      <BuilderEntryItem
        entry={{
          field: getField('ip'),
          operator: isNotOperator,
          value: '1234',
          nested: undefined,
          parent: undefined,
          entryIndex: 0,
          correspondingKeywordField: undefined,
        }}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').text()).toEqual('ip');
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryOperator"]').text()).toEqual(
      'is not'
    );
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryFieldMatch"]').text()).toEqual(
      '1234'
    );
  });

  test('it renders field values correctly when operator is "isOneOfOperator"', () => {
    wrapper = mount(
      <BuilderEntryItem
        entry={{
          field: getField('ip'),
          operator: isOneOfOperator,
          value: ['1234'],
          nested: undefined,
          parent: undefined,
          entryIndex: 0,
          correspondingKeywordField: undefined,
        }}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').text()).toEqual('ip');
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryOperator"]').text()).toEqual(
      'is one of'
    );
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryFieldMatchAny"]').text()).toEqual(
      '1234'
    );
  });

  test('it renders field values correctly when operator is "isNotOneOfOperator"', () => {
    wrapper = mount(
      <BuilderEntryItem
        entry={{
          field: getField('ip'),
          operator: isNotOneOfOperator,
          value: ['1234'],
          nested: undefined,
          parent: undefined,
          entryIndex: 0,
          correspondingKeywordField: undefined,
        }}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').text()).toEqual('ip');
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryOperator"]').text()).toEqual(
      'is not one of'
    );
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryFieldMatchAny"]').text()).toEqual(
      '1234'
    );
  });

  test('it renders field values correctly when operator is "isInListOperator"', () => {
    wrapper = mount(
      <BuilderEntryItem
        entry={{
          field: getField('ip'),
          operator: isInListOperator,
          value: 'some-list-id',
          nested: undefined,
          parent: undefined,
          entryIndex: 0,
          correspondingKeywordField: undefined,
        }}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={true}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').text()).toEqual('ip');
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryOperator"]').text()).toEqual(
      'is in list'
    );
    expect(
      wrapper.find('[data-test-subj="valuesAutocompleteComboBox listsComboxBox"]').at(1).text()
    ).toEqual('some name');
  });

  test('it renders field values correctly when operator is "isNotInListOperator"', () => {
    wrapper = mount(
      <BuilderEntryItem
        entry={{
          field: getField('ip'),
          operator: isNotInListOperator,
          value: 'some-list-id',
          nested: undefined,
          parent: undefined,
          entryIndex: 0,
          correspondingKeywordField: undefined,
        }}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={true}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').text()).toEqual('ip');
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryOperator"]').text()).toEqual(
      'is not in list'
    );
    expect(
      wrapper.find('[data-test-subj="valuesAutocompleteComboBox listsComboxBox"]').at(1).text()
    ).toEqual('some name');
  });

  test('it renders field values correctly when operator is "existsOperator"', () => {
    wrapper = mount(
      <BuilderEntryItem
        entry={{
          field: getField('ip'),
          operator: existsOperator,
          value: undefined,
          nested: undefined,
          parent: undefined,
          entryIndex: 0,
          correspondingKeywordField: undefined,
        }}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').text()).toEqual('ip');
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryOperator"]').text()).toEqual(
      'exists'
    );
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryFieldExists"]').text()).toEqual(
      getEmptyValue()
    );
    expect(
      wrapper.find('[data-test-subj="exceptionBuilderEntryFieldExists"] input').props().disabled
    ).toBeTruthy();
  });

  test('it renders field values correctly when operator is "doesNotExistOperator"', () => {
    wrapper = mount(
      <BuilderEntryItem
        entry={{
          field: getField('ip'),
          operator: doesNotExistOperator,
          value: undefined,
          nested: undefined,
          parent: undefined,
          entryIndex: 0,
          correspondingKeywordField: undefined,
        }}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').text()).toEqual('ip');
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryOperator"]').text()).toEqual(
      'does not exist'
    );
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryFieldExists"]').text()).toEqual(
      getEmptyValue()
    );
    expect(
      wrapper.find('[data-test-subj="exceptionBuilderEntryFieldExists"] input').props().disabled
    ).toBeTruthy();
  });

  test('it uses "correspondingKeywordField" if it exists', () => {
    wrapper = mount(
      <BuilderEntryItem
        entry={{
          field: {
            name: 'extension.text',
            type: 'string',
            esTypes: ['text'],
            count: 0,
            scripted: false,
            searchable: false,
            aggregatable: false,
            readFromDocValues: true,
          },
          operator: isOneOfOperator,
          value: ['1234'],
          nested: undefined,
          parent: undefined,
          entryIndex: 0,
          correspondingKeywordField: {
            name: 'extension',
            type: 'string',
            esTypes: ['keyword'],
            count: 0,
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: true,
          },
        }}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
      />
    );

    expect(
      wrapper.find('[data-test-subj="exceptionBuilderEntryFieldMatchAny"]').prop('selectedField')
    ).toEqual({
      name: 'extension',
      type: 'string',
      esTypes: ['keyword'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    });
  });

  test('it invokes "onChange" when new field is selected and resets operator and value fields', () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
      <BuilderEntryItem
        entry={{
          field: getField('ip'),
          operator: isOperator,
          value: '1234',
          nested: undefined,
          parent: undefined,
          entryIndex: 0,
          correspondingKeywordField: undefined,
        }}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        listType="detection"
        onChange={mockOnChange}
        setErrorsExist={jest.fn()}
      />
    );

    ((wrapper.find(EuiComboBox).at(0).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'machine.os' }]);

    expect(mockOnChange).toHaveBeenCalledWith(
      { field: 'machine.os', operator: 'included', type: 'match', value: '' },
      0
    );
  });

  test('it invokes "onChange" when new operator is selected', () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
      <BuilderEntryItem
        entry={{
          field: getField('ip'),
          operator: isOperator,
          value: '1234',
          nested: undefined,
          parent: undefined,
          entryIndex: 0,
          correspondingKeywordField: undefined,
        }}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        listType="detection"
        onChange={mockOnChange}
        setErrorsExist={jest.fn()}
      />
    );

    ((wrapper.find(EuiComboBox).at(1).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'is not' }]);

    expect(mockOnChange).toHaveBeenCalledWith(
      { field: 'ip', operator: 'excluded', type: 'match', value: '1234' },
      0
    );
  });

  test('it invokes "onChange" when new value field is entered for match operator', () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
      <BuilderEntryItem
        entry={{
          field: getField('ip'),
          operator: isNotOperator,
          value: '1234',
          nested: undefined,
          parent: undefined,
          entryIndex: 0,
          correspondingKeywordField: undefined,
        }}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        listType="detection"
        onChange={mockOnChange}
        setErrorsExist={jest.fn()}
      />
    );

    ((wrapper.find(EuiComboBox).at(2).props() as unknown) as {
      onCreateOption: (a: string) => void;
    }).onCreateOption('126.45.211.34');

    expect(mockOnChange).toHaveBeenCalledWith(
      { field: 'ip', operator: 'excluded', type: 'match', value: '126.45.211.34' },
      0
    );
  });

  test('it invokes "onChange" when new value field is entered for match_any operator', () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
      <BuilderEntryItem
        entry={{
          field: getField('ip'),
          operator: isOneOfOperator,
          value: '1234',
          nested: undefined,
          parent: undefined,
          entryIndex: 0,
          correspondingKeywordField: undefined,
        }}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        listType="detection"
        onChange={mockOnChange}
        setErrorsExist={jest.fn()}
      />
    );

    ((wrapper.find(EuiComboBox).at(2).props() as unknown) as {
      onCreateOption: (a: string) => void;
    }).onCreateOption('126.45.211.34');

    expect(mockOnChange).toHaveBeenCalledWith(
      { field: 'ip', operator: 'included', type: 'match_any', value: ['126.45.211.34'] },
      0
    );
  });

  test('it invokes "onChange" when new value field is entered for list operator', () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
      <BuilderEntryItem
        entry={{
          field: getField('ip'),
          operator: isNotInListOperator,
          value: '1234',
          nested: undefined,
          parent: undefined,
          entryIndex: 0,
          correspondingKeywordField: undefined,
        }}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        listType="detection"
        onChange={mockOnChange}
        setErrorsExist={jest.fn()}
      />
    );

    ((wrapper.find(EuiComboBox).at(2).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'some name' }]);

    expect(mockOnChange).toHaveBeenCalledWith(
      {
        field: 'ip',
        operator: 'excluded',
        type: 'list',
        list: { id: 'some-list-id', type: 'ip' },
      },
      0
    );
  });

  test('it invokes "setErrorsExist" when user touches value input and leaves empty', () => {
    const mockSetErrorExists = jest.fn();
    wrapper = mount(
      <BuilderEntryItem
        entry={{
          field: getField('bytes'),
          operator: isOneOfOperator,
          value: '',
          nested: undefined,
          parent: undefined,
          entryIndex: 0,
          correspondingKeywordField: undefined,
        }}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={mockSetErrorExists}
      />
    );

    ((wrapper.find(EuiComboBox).at(2).props() as unknown) as {
      onBlur: () => void;
    }).onBlur();

    expect(mockSetErrorExists).toHaveBeenCalledWith(true);
  });

  test('it invokes "setErrorsExist" when invalid value inputted for field value input', () => {
    const mockSetErrorExists = jest.fn();
    wrapper = mount(
      <BuilderEntryItem
        entry={{
          field: getField('bytes'),
          operator: isOneOfOperator,
          value: '',
          nested: undefined,
          parent: undefined,
          entryIndex: 0,
          correspondingKeywordField: undefined,
        }}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={mockSetErrorExists}
      />
    );
    ((wrapper.find(EuiComboBox).at(2).props() as unknown) as {
      onBlur: () => void;
    }).onBlur();

    // Invalid input because field type is number
    ((wrapper.find(EuiComboBox).at(2).props() as unknown) as {
      onSearchChange: (arg: string) => void;
    }).onSearchChange('hellooo');

    expect(mockSetErrorExists).toHaveBeenCalledWith(true);
  });
});
