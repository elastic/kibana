/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import { EntryItemComponent } from './entry_item';
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
} from '../../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks.ts';
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

describe('EntryItemComponent', () => {
  test('it renders fields disabled if "isLoading" is "true"', () => {
    const wrapper = mount(
      <EntryItemComponent
        entry={{ field: undefined, operator: isOperator, value: undefined }}
        entryIndex={0}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        isLoading={true}
        onChange={jest.fn()}
      />
    );

    expect(
      wrapper.find('[data-test-subj="exceptionBuilderEntryField"] input').props().disabled
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="exceptionBuilderEntryOperator"] input').props().disabled
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="exceptionBuilderEntryFieldMatch"] input').props().disabled
    ).toBeTruthy();
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryFieldFormRow"]')).toHaveLength(0);
  });

  test('it renders field labels if "showLabel" is "true"', () => {
    const wrapper = mount(
      <EntryItemComponent
        entry={{ field: undefined, operator: isOperator, value: undefined }}
        entryIndex={0}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={true}
        isLoading={false}
        onChange={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryFieldFormRow"]')).not.toEqual(0);
  });

  test('it renders field values correctly when operator is "isOperator"', () => {
    const wrapper = mount(
      <EntryItemComponent
        entry={{ field: getField('ip'), operator: isOperator, value: '1234' }}
        entryIndex={0}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        isLoading={false}
        onChange={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').text()).toEqual('ip');
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryOperator"]').text()).toEqual('is');
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryFieldMatch"]').text()).toEqual(
      '1234'
    );
  });

  test('it renders field values correctly when operator is "isNotOperator"', () => {
    const wrapper = mount(
      <EntryItemComponent
        entry={{ field: getField('ip'), operator: isNotOperator, value: '1234' }}
        entryIndex={0}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        isLoading={false}
        onChange={jest.fn()}
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
    const wrapper = mount(
      <EntryItemComponent
        entry={{ field: getField('ip'), operator: isOneOfOperator, value: ['1234'] }}
        entryIndex={0}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        isLoading={false}
        onChange={jest.fn()}
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
    const wrapper = mount(
      <EntryItemComponent
        entry={{ field: getField('ip'), operator: isNotOneOfOperator, value: ['1234'] }}
        entryIndex={0}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        isLoading={false}
        onChange={jest.fn()}
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
    const wrapper = mount(
      <EntryItemComponent
        entry={{ field: getField('ip'), operator: isInListOperator, value: 'some-list-id' }}
        entryIndex={0}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        isLoading={false}
        onChange={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').text()).toEqual('ip');
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryOperator"]').text()).toEqual(
      'is in list'
    );
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryFieldList"]').text()).toEqual(
      'some name'
    );
  });

  test('it renders field values correctly when operator is "isNotInListOperator"', () => {
    const wrapper = mount(
      <EntryItemComponent
        entry={{ field: getField('ip'), operator: isNotInListOperator, value: 'some-list-id' }}
        entryIndex={0}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        isLoading={false}
        onChange={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').text()).toEqual('ip');
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryOperator"]').text()).toEqual(
      'is not in list'
    );
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryFieldList"]').text()).toEqual(
      'some name'
    );
  });

  test('it renders field values correctly when operator is "existsOperator"', () => {
    const wrapper = mount(
      <EntryItemComponent
        entry={{ field: getField('ip'), operator: existsOperator, value: undefined }}
        entryIndex={0}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        isLoading={false}
        onChange={jest.fn()}
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
    const wrapper = mount(
      <EntryItemComponent
        entry={{ field: getField('ip'), operator: doesNotExistOperator, value: undefined }}
        entryIndex={0}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        isLoading={false}
        onChange={jest.fn()}
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

  test('it invokes "onChange" when new field is selected and resets operator and value fields', () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <EntryItemComponent
        entry={{ field: getField('ip'), operator: isOperator, value: '1234' }}
        entryIndex={0}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        isLoading={false}
        onChange={mockOnChange}
      />
    );

    ((wrapper.find(EuiComboBox).at(0).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'machine.os' }]);

    expect(mockOnChange).toHaveBeenCalledWith(
      { field: 'machine.os', operator: 'included', type: 'match', value: undefined },
      0
    );
  });

  test('it invokes "onChange" when new operator is selected and resets value field', () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <EntryItemComponent
        entry={{ field: getField('ip'), operator: isOperator, value: '1234' }}
        entryIndex={0}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        isLoading={false}
        onChange={mockOnChange}
      />
    );

    ((wrapper.find(EuiComboBox).at(1).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'is not' }]);

    expect(mockOnChange).toHaveBeenCalledWith(
      { field: 'ip', operator: 'excluded', type: 'match', value: '' },
      0
    );
  });

  test('it invokes "onChange" when new value field is entered for match operator', () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <EntryItemComponent
        entry={{ field: getField('ip'), operator: isNotOperator, value: '1234' }}
        entryIndex={0}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        isLoading={false}
        onChange={mockOnChange}
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
    const wrapper = mount(
      <EntryItemComponent
        entry={{ field: getField('ip'), operator: isOneOfOperator, value: '1234' }}
        entryIndex={0}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        isLoading={false}
        onChange={mockOnChange}
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
    const wrapper = mount(
      <EntryItemComponent
        entry={{ field: getField('ip'), operator: isNotInListOperator, value: '1234' }}
        entryIndex={0}
        indexPattern={{
          id: '1234',
          title: 'logstash-*',
          fields,
        }}
        showLabel={false}
        isLoading={false}
        onChange={mockOnChange}
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
});
