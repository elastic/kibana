/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import { EntryItem } from './entry_item';
import {
  fields,
  getField,
} from '../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks';
import { IndexPattern } from 'src/plugins/data/public';

jest.mock('../../../common/lib/kibana');

describe('EntryItem', () => {
  test('it renders field labels if "showLabel" is "true"', () => {
    const wrapper = mount(
      <EntryItem
        entry={{
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
          } as IndexPattern
        }
        showLabel={true}
        onChange={jest.fn()}
        threatIndexPatterns={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as IndexPattern
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
          } as IndexPattern
        }
        threatIndexPatterns={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as IndexPattern
        }
        showLabel={false}
        onChange={mockOnChange}
      />
    );

    ((wrapper.find(EuiComboBox).at(0).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'machine.os' }]);

    expect(mockOnChange).toHaveBeenCalledWith(
      {
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
          } as IndexPattern
        }
        threatIndexPatterns={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as IndexPattern
        }
        showLabel={false}
        onChange={mockOnChange}
      />
    );

    ((wrapper.find(EuiComboBox).at(1).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'is not' }]);

    expect(mockOnChange).toHaveBeenCalledWith({ field: 'ip', type: 'mapping', value: '' }, 0);
  });
});
