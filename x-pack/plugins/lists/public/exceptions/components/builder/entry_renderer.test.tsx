/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactWrapper, mount } from 'enzyme';
import React from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { waitFor } from '@testing-library/dom';

import {
  doesNotExistOperator,
  existsOperator,
  isInListOperator,
  isNotInListOperator,
  isNotOneOfOperator,
  isNotOperator,
  isOneOfOperator,
  isOperator,
} from '../autocomplete/operators';
import {
  fields,
  getField,
} from '../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { getFoundListSchemaMock } from '../../../../common/schemas/response/found_list_schema.mock';
import { useFindLists } from '../../../lists/hooks/use_find_lists';

import { BuilderEntryItem } from './entry_renderer';

jest.mock('../../../lists/hooks/use_find_lists');

const mockKibanaHttpService = coreMock.createStart().http;
const { autocomplete: autocompleteStartMock } = dataPluginMock.createStartContract();

describe('BuilderEntryItem', () => {
  let wrapper: ReactWrapper;

  beforeEach(() => {
    (useFindLists as jest.Mock).mockReturnValue({
      error: undefined,
      loading: false,
      result: getFoundListSchemaMock(),
      start: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    wrapper.unmount();
  });

  test('it renders field labels if "showLabel" is "true"', () => {
    wrapper = mount(
      <BuilderEntryItem
        autocompleteService={autocompleteStartMock}
        entry={{
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: undefined,
          id: '123',
          nested: undefined,
          operator: isOperator,
          parent: undefined,
          value: undefined,
        }}
        httpService={mockKibanaHttpService}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
        showLabel={true}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryFieldFormRow"]')).not.toEqual(0);
  });

  test('it renders field values correctly when operator is "isOperator"', () => {
    wrapper = mount(
      <BuilderEntryItem
        autocompleteService={autocompleteStartMock}
        entry={{
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: getField('ip'),
          id: '123',
          nested: undefined,
          operator: isOperator,
          parent: undefined,
          value: '1234',
        }}
        httpService={mockKibanaHttpService}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
        showLabel={false}
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
        autocompleteService={autocompleteStartMock}
        entry={{
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: getField('ip'),
          id: '123',
          nested: undefined,
          operator: isNotOperator,
          parent: undefined,
          value: '1234',
        }}
        httpService={mockKibanaHttpService}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
        showLabel={false}
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
        autocompleteService={autocompleteStartMock}
        entry={{
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: getField('ip'),
          id: '123',
          nested: undefined,
          operator: isOneOfOperator,
          parent: undefined,
          value: ['1234'],
        }}
        httpService={mockKibanaHttpService}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
        showLabel={false}
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
        autocompleteService={autocompleteStartMock}
        entry={{
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: getField('ip'),
          id: '123',
          nested: undefined,
          operator: isNotOneOfOperator,
          parent: undefined,
          value: ['1234'],
        }}
        httpService={mockKibanaHttpService}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
        showLabel={false}
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
        autocompleteService={autocompleteStartMock}
        entry={{
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: getField('ip'),
          id: '123',
          nested: undefined,
          operator: isInListOperator,
          parent: undefined,
          value: 'some-list-id',
        }}
        httpService={mockKibanaHttpService}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
        showLabel={true}
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
        autocompleteService={autocompleteStartMock}
        entry={{
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: getField('ip'),
          id: '123',
          nested: undefined,
          operator: isNotInListOperator,
          parent: undefined,
          value: 'some-list-id',
        }}
        httpService={mockKibanaHttpService}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
        showLabel={true}
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
        autocompleteService={autocompleteStartMock}
        entry={{
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: getField('ip'),
          id: '123',
          nested: undefined,
          operator: existsOperator,
          parent: undefined,
          value: undefined,
        }}
        httpService={mockKibanaHttpService}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
        showLabel={false}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').text()).toEqual('ip');
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryOperator"]').text()).toEqual(
      'exists'
    );
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryFieldExists"]').text()).toEqual('—');
    expect(
      wrapper.find('[data-test-subj="exceptionBuilderEntryFieldExists"] input').props().disabled
    ).toBeTruthy();
  });

  test('it renders field values correctly when operator is "doesNotExistOperator"', () => {
    wrapper = mount(
      <BuilderEntryItem
        autocompleteService={autocompleteStartMock}
        entry={{
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: getField('ip'),
          id: '123',
          nested: undefined,
          operator: doesNotExistOperator,
          parent: undefined,
          value: undefined,
        }}
        httpService={mockKibanaHttpService}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
        showLabel={false}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').text()).toEqual('ip');
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryOperator"]').text()).toEqual(
      'does not exist'
    );
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryFieldExists"]').text()).toEqual('—');
    expect(
      wrapper.find('[data-test-subj="exceptionBuilderEntryFieldExists"] input').props().disabled
    ).toBeTruthy();
  });

  test('it uses "correspondingKeywordField" if it exists', () => {
    wrapper = mount(
      <BuilderEntryItem
        autocompleteService={autocompleteStartMock}
        entry={{
          correspondingKeywordField: {
            aggregatable: true,
            count: 0,
            esTypes: ['keyword'],
            name: 'extension',
            readFromDocValues: true,
            scripted: false,
            searchable: true,
            type: 'string',
          },
          entryIndex: 0,
          field: {
            aggregatable: false,
            count: 0,
            esTypes: ['text'],
            name: 'extension.text',
            readFromDocValues: true,
            scripted: false,
            searchable: false,
            type: 'string',
          },
          id: '123',
          nested: undefined,
          operator: isOneOfOperator,
          parent: undefined,
          value: ['1234'],
        }}
        httpService={mockKibanaHttpService}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
        showLabel={false}
      />
    );

    expect(
      wrapper.find('[data-test-subj="exceptionBuilderEntryFieldMatchAny"]').prop('selectedField')
    ).toEqual({
      aggregatable: true,
      count: 0,
      esTypes: ['keyword'],
      name: 'extension',
      readFromDocValues: true,
      scripted: false,
      searchable: true,
      type: 'string',
    });
  });

  test('it invokes "onChange" when new field is selected and resets operator and value fields', () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
      <BuilderEntryItem
        autocompleteService={autocompleteStartMock}
        entry={{
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: getField('ip'),
          id: '123',
          nested: undefined,
          operator: isOperator,
          parent: undefined,
          value: '1234',
        }}
        httpService={mockKibanaHttpService}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        listType="detection"
        onChange={mockOnChange}
        setErrorsExist={jest.fn()}
        showLabel={false}
      />
    );

    ((wrapper.find(EuiComboBox).at(0).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'machine.os' }]);

    expect(mockOnChange).toHaveBeenCalledWith(
      { field: 'machine.os', id: '123', operator: 'included', type: 'match', value: '' },
      0
    );
  });

  test('it invokes "onChange" when new operator is selected', () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
      <BuilderEntryItem
        autocompleteService={autocompleteStartMock}
        entry={{
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: getField('ip'),
          id: '123',
          nested: undefined,
          operator: isOperator,
          parent: undefined,
          value: '1234',
        }}
        httpService={mockKibanaHttpService}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        listType="detection"
        onChange={mockOnChange}
        setErrorsExist={jest.fn()}
        showLabel={false}
      />
    );

    ((wrapper.find(EuiComboBox).at(1).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'is not' }]);

    expect(mockOnChange).toHaveBeenCalledWith(
      { field: 'ip', id: '123', operator: 'excluded', type: 'match', value: '1234' },
      0
    );
  });

  test('it invokes "onChange" when new value field is entered for match operator', () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
      <BuilderEntryItem
        autocompleteService={autocompleteStartMock}
        entry={{
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: getField('ip'),
          id: '123',
          nested: undefined,
          operator: isNotOperator,
          parent: undefined,
          value: '1234',
        }}
        httpService={mockKibanaHttpService}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        listType="detection"
        onChange={mockOnChange}
        setErrorsExist={jest.fn()}
        showLabel={false}
      />
    );

    ((wrapper.find(EuiComboBox).at(2).props() as unknown) as {
      onCreateOption: (a: string) => void;
    }).onCreateOption('126.45.211.34');

    expect(mockOnChange).toHaveBeenCalledWith(
      { field: 'ip', id: '123', operator: 'excluded', type: 'match', value: '126.45.211.34' },
      0
    );
  });

  test('it invokes "onChange" when new value field is entered for match_any operator', () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
      <BuilderEntryItem
        autocompleteService={autocompleteStartMock}
        entry={{
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: getField('ip'),
          id: '123',
          nested: undefined,
          operator: isOneOfOperator,
          parent: undefined,
          value: '1234',
        }}
        httpService={mockKibanaHttpService}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        listType="detection"
        onChange={mockOnChange}
        setErrorsExist={jest.fn()}
        showLabel={false}
      />
    );

    ((wrapper.find(EuiComboBox).at(2).props() as unknown) as {
      onCreateOption: (a: string) => void;
    }).onCreateOption('126.45.211.34');

    expect(mockOnChange).toHaveBeenCalledWith(
      { field: 'ip', id: '123', operator: 'included', type: 'match_any', value: ['126.45.211.34'] },
      0
    );
  });

  test('it invokes "onChange" when new value field is entered for list operator', () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
      <BuilderEntryItem
        autocompleteService={autocompleteStartMock}
        entry={{
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: getField('ip'),
          id: '123',
          nested: undefined,
          operator: isNotInListOperator,
          parent: undefined,
          value: '1234',
        }}
        httpService={mockKibanaHttpService}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        listType="detection"
        onChange={mockOnChange}
        setErrorsExist={jest.fn()}
        showLabel={false}
      />
    );

    ((wrapper.find(EuiComboBox).at(2).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'some name' }]);

    expect(mockOnChange).toHaveBeenCalledWith(
      {
        field: 'ip',
        id: '123',
        list: { id: 'some-list-id', type: 'ip' },
        operator: 'excluded',
        type: 'list',
      },
      0
    );
  });

  test('it invokes "setErrorsExist" when user touches value input and leaves empty', async () => {
    const mockSetErrorExists = jest.fn();
    wrapper = mount(
      <BuilderEntryItem
        autocompleteService={autocompleteStartMock}
        entry={{
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: getField('bytes'),
          id: '123',
          nested: undefined,
          operator: isOneOfOperator,
          parent: undefined,
          value: '',
        }}
        httpService={mockKibanaHttpService}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={mockSetErrorExists}
        showLabel={false}
      />
    );

    await waitFor(() => {
      ((wrapper.find(EuiComboBox).at(2).props() as unknown) as {
        onBlur: () => void;
      }).onBlur();
    });

    expect(mockSetErrorExists).toHaveBeenCalledWith(true);
  });

  test('it invokes "setErrorsExist" when invalid value inputted for field value input', async () => {
    const mockSetErrorExists = jest.fn();
    wrapper = mount(
      <BuilderEntryItem
        autocompleteService={autocompleteStartMock}
        entry={{
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: getField('bytes'),
          id: '123',
          nested: undefined,
          operator: isOneOfOperator,
          parent: undefined,
          value: '',
        }}
        httpService={mockKibanaHttpService}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={mockSetErrorExists}
        showLabel={false}
      />
    );

    await waitFor(() => {
      ((wrapper.find(EuiComboBox).at(2).props() as unknown) as {
        onBlur: () => void;
      }).onBlur();

      // Invalid input because field type is number
      ((wrapper.find(EuiComboBox).at(2).props() as unknown) as {
        onSearchChange: (arg: string) => void;
      }).onSearchChange('hellooo');
    });

    expect(mockSetErrorExists).toHaveBeenCalledWith(true);
  });

  test('it disabled field inputs correctly when passed "isDisabled=true"', () => {
    wrapper = mount(
      <BuilderEntryItem
        autocompleteService={autocompleteStartMock}
        entry={{
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: getField('ip'),
          id: '123',
          nested: undefined,
          operator: isOneOfOperator,
          parent: undefined,
          value: ['1234'],
        }}
        httpService={mockKibanaHttpService}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        listType="detection"
        onChange={jest.fn()}
        setErrorsExist={jest.fn()}
        osTypes={['windows']}
        showLabel={false}
        isDisabled={true}
      />
    );
    expect(
      wrapper.find('[data-test-subj="exceptionBuilderEntryField"] input').props().disabled
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="exceptionBuilderEntryOperator"] input').props().disabled
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="exceptionBuilderEntryFieldMatchAny"] input').props().disabled
    ).toBeTruthy();
  });
});
