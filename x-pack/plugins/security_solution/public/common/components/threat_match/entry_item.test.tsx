/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import { EntryItem } from './entry_item';
import { fields, getField } from '@kbn/data-plugin/common/mocks';
import type { DataViewBase } from '@kbn/es-query';

jest.mock('../../lib/kibana');

describe('EntryItem', () => {
  test('it renders field labels if "showLabel" is "true"', () => {
    const wrapper = mount(
      <EntryItem
        entry={{
          id: '123',
          field: undefined,
          value: undefined,
          type: 'mapping',
          entryIndex: 0,
        }}
        indexPattern={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
        showLabel={true}
        onChange={jest.fn()}
        threatIndexPatterns={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
      />
    );

    expect(wrapper.find('[data-test-subj="threatFieldInputFormRow"]')).not.toEqual(0);
  });

  test('it invokes "onChange" when new field is selected and resets value fields', () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <EntryItem
        entry={{
          id: '123',
          field: getField('ip'),
          type: 'mapping',
          value: getField('ip'),
          entryIndex: 0,
        }}
        indexPattern={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
        threatIndexPatterns={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
        showLabel={false}
        onChange={mockOnChange}
      />
    );

    (
      wrapper.find(EuiComboBox).at(0).props() as unknown as {
        onChange: (a: EuiComboBoxOptionOption[]) => void;
      }
    ).onChange([{ label: 'machine.os' }]);

    expect(mockOnChange).toHaveBeenCalledWith(
      {
        id: '123',
        field: 'machine.os',
        type: 'mapping',
        value: 'ip',
      },
      0
    );
  });

  test('it invokes "onChange" when new value is selected', () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <EntryItem
        entry={{
          id: '123',
          field: getField('ip'),
          type: 'mapping',
          value: getField('ip'),
          entryIndex: 0,
        }}
        indexPattern={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
        threatIndexPatterns={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
        showLabel={false}
        onChange={mockOnChange}
      />
    );

    (
      wrapper.find(EuiComboBox).at(1).props() as unknown as {
        onChange: (a: EuiComboBoxOptionOption[]) => void;
      }
    ).onChange([{ label: 'is not' }]);

    expect(mockOnChange).toHaveBeenCalledWith(
      { id: '123', field: 'ip', type: 'mapping', value: '' },
      0
    );
  });
});
