/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { shallow } from 'enzyme';
import { EuiPopoverTitle } from '@elastic/eui';
import { OfExpression } from './of';

describe('of expression', () => {
  it('renders of builtin aggregation types', () => {
    const onChangeSelectedAggField = jest.fn();
    const wrapper = shallow(
      <OfExpression
        aggType="count"
        errors={{ aggField: [] }}
        fields={[{ normalizedType: 'number', name: 'test', text: 'test text' }]}
        aggField="test"
        onChangeSelectedAggField={onChangeSelectedAggField}
      />
    );
    expect(wrapper.find('[data-test-subj="availablefieldsOptionsComboBox"]'))
      .toMatchInlineSnapshot(`
      <EuiComboBox
        compressed={false}
        data-test-subj="availablefieldsOptionsComboBox"
        fullWidth={true}
        isClearable={true}
        isInvalid={false}
        noSuggestions={true}
        onChange={[Function]}
        options={Array []}
        placeholder="Select a field"
        selectedOptions={
          Array [
            Object {
              "label": "test",
            },
          ]
        }
        singleSelection={
          Object {
            "asPlainText": true,
          }
        }
      />
    `);
  });

  it('renders with custom aggregation types', () => {
    const onChangeSelectedAggField = jest.fn();
    const wrapper = shallow(
      <OfExpression
        aggType="test2"
        errors={{ aggField: [] }}
        fields={[{ normalizedType: 'number', name: 'test2', text: 'test text' }]}
        aggField="test"
        onChangeSelectedAggField={onChangeSelectedAggField}
        customAggTypesOptions={{
          test1: {
            text: 'Test1()',
            fieldRequired: false,
            value: 'test1',
            validNormalizedTypes: [],
          },
          test2: {
            text: 'Test2()',
            fieldRequired: true,
            validNormalizedTypes: ['number'],
            value: 'test2',
          },
        }}
      />
    );
    expect(wrapper.find('[data-test-subj="availablefieldsOptionsComboBox"]'))
      .toMatchInlineSnapshot(`
    <EuiComboBox
      compressed={false}
      data-test-subj="availablefieldsOptionsComboBox"
      fullWidth={true}
      isClearable={true}
      isInvalid={false}
      noSuggestions={false}
      onChange={[Function]}
      options={
        Array [
          Object {
            "label": "test2",
          },
        ]
      }
      placeholder="Select a field"
      selectedOptions={
        Array [
          Object {
            "label": "test",
          },
        ]
      }
      singleSelection={
        Object {
          "asPlainText": true,
        }
      }
    />
    `);
  });

  it('renders with default aggreagation type preselected if no aggType was set', () => {
    const onChangeSelectedAggField = jest.fn();
    const wrapper = shallow(
      <OfExpression
        aggType="count"
        errors={{ aggField: [] }}
        fields={[{ normalizedType: 'number', name: 'test', text: 'test text' }]}
        aggField="test"
        onChangeSelectedAggField={onChangeSelectedAggField}
      />
    );
    wrapper.simulate('click');
    expect(wrapper.contains(<EuiPopoverTitle>of</EuiPopoverTitle>)).toBeTruthy();
  });
});
