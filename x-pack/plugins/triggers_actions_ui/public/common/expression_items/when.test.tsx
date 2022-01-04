/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { shallow } from 'enzyme';
import { WhenExpression } from './when';
import { FormattedMessage } from '@kbn/i18n-react';

describe('when expression', () => {
  it('renders with builtin aggregation types', () => {
    const onChangeSelectedAggType = jest.fn();
    const wrapper = shallow(
      <WhenExpression aggType={'count'} onChangeSelectedAggType={onChangeSelectedAggType} />
    );
    expect(wrapper.find('[data-test-subj="whenExpressionSelect"]')).toMatchInlineSnapshot(`
    <EuiSelect
      data-test-subj="whenExpressionSelect"
      fullWidth={true}
      id="aggTypeField"
      onChange={[Function]}
      options={
        Array [
          Object {
            "text": "count()",
            "value": "count",
          },
          Object {
            "text": "average()",
            "value": "avg",
          },
          Object {
            "text": "sum()",
            "value": "sum",
          },
          Object {
            "text": "min()",
            "value": "min",
          },
          Object {
            "text": "max()",
            "value": "max",
          },
        ]
      }
      value="count"
    />
    `);
  });

  it('renders with custom aggregation types', () => {
    const onChangeSelectedAggType = jest.fn();
    const wrapper = shallow(
      <WhenExpression
        aggType={'count'}
        onChangeSelectedAggType={onChangeSelectedAggType}
        customAggTypesOptions={{
          count: {
            text: 'Test1()',
            fieldRequired: false,
            value: 'test1',
            validNormalizedTypes: [],
          },
          avg: {
            text: 'Test2()',
            fieldRequired: true,
            validNormalizedTypes: ['number'],
            value: 'test2',
          },
        }}
      />
    );

    expect(wrapper.find('[data-test-subj="whenExpressionSelect"]')).toMatchInlineSnapshot(`
    <EuiSelect
      data-test-subj="whenExpressionSelect"
      fullWidth={true}
      id="aggTypeField"
      onChange={[Function]}
      options={
        Array [
          Object {
            "text": "Test1()",
            "value": "test1",
          },
          Object {
            "text": "Test2()",
            "value": "test2",
          },
        ]
      }
      value="count"
    />
    `);
  });

  it('renders when popover title', () => {
    const onChangeSelectedAggType = jest.fn();
    const wrapper = shallow(
      <WhenExpression aggType={'avg'} onChangeSelectedAggType={onChangeSelectedAggType} />
    );
    wrapper.simulate('click');
    expect(wrapper.find('[value="avg"]').length > 0).toBeTruthy();
    expect(
      wrapper.contains(
        <FormattedMessage
          id="xpack.triggersActionsUI.common.expressionItems.threshold.popoverTitle"
          defaultMessage="when"
        />
      )
    ).toBeTruthy();
  });
});
