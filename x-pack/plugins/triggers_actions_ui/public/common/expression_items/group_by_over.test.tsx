/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { shallow } from 'enzyme';
import { GroupByExpression } from './group_by_over';
import { FormattedMessage } from '@kbn/i18n-react';

describe('group by expression', () => {
  it('renders with builtin group by types', () => {
    const onChangeSelectedTermField = jest.fn();
    const onChangeSelectedGroupBy = jest.fn();
    const onChangeSelectedTermSize = jest.fn();
    const wrapper = shallow(
      <GroupByExpression
        errors={{ termSize: [], termField: [] }}
        fields={[{}]}
        groupBy={'all'}
        onChangeSelectedGroupBy={onChangeSelectedGroupBy}
        onChangeSelectedTermField={onChangeSelectedTermField}
        onChangeSelectedTermSize={onChangeSelectedTermSize}
      />
    );
    expect(wrapper.find('[data-test-subj="overExpressionSelect"]')).toMatchInlineSnapshot(`
      <EuiSelect
        data-test-subj="overExpressionSelect"
        onChange={[Function]}
        options={
          Array [
            Object {
              "text": "all documents",
              "value": "all",
            },
            Object {
              "text": "top",
              "value": "top",
            },
          ]
        }
        value="all"
      />
    `);
  });

  it('renders with aggregation type fields', () => {
    const onChangeSelectedTermField = jest.fn();
    const onChangeSelectedGroupBy = jest.fn();
    const onChangeSelectedTermSize = jest.fn();
    const wrapper = shallow(
      <GroupByExpression
        errors={{ termSize: [], termField: [] }}
        fields={[{ normalizedType: 'number', name: 'test', text: 'test text' }]}
        groupBy={'top'}
        onChangeSelectedGroupBy={onChangeSelectedGroupBy}
        onChangeSelectedTermField={onChangeSelectedTermField}
        onChangeSelectedTermSize={onChangeSelectedTermSize}
      />
    );

    expect(wrapper.find('[data-test-subj="fieldsExpressionSelect"]')).toMatchInlineSnapshot(`
        <EuiSelect
          data-test-subj="fieldsExpressionSelect"
          isInvalid={false}
          onBlur={[Function]}
          onChange={[Function]}
          options={
            Array [
              Object {
                "text": "Select a field",
                "value": "",
              },
              Object {
                "text": "test",
                "value": "test",
              },
            ]
          }
        />
    `);
  });

  it('renders with default aggreagation type preselected if no aggType was set', () => {
    const onChangeSelectedTermField = jest.fn();
    const onChangeSelectedGroupBy = jest.fn();
    const onChangeSelectedTermSize = jest.fn();
    const wrapper = shallow(
      <GroupByExpression
        errors={{ termSize: [], termField: [] }}
        fields={[{}]}
        groupBy={'all'}
        onChangeSelectedGroupBy={onChangeSelectedGroupBy}
        onChangeSelectedTermField={onChangeSelectedTermField}
        onChangeSelectedTermSize={onChangeSelectedTermSize}
      />
    );
    wrapper.simulate('click');
    expect(wrapper.find('[value="all"]').length > 0).toBeTruthy();
    expect(
      wrapper.contains(
        <FormattedMessage
          id="xpack.triggersActionsUI.common.expressionItems.groupByType.overButtonLabel"
          defaultMessage="over"
        />
      )
    ).toBeTruthy();
  });
});
