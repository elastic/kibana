/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { shallow } from 'enzyme';
import { EuiPopoverTitle } from '@elastic/eui';
import { ThresholdExpression } from './threshold';

describe('threshold expression', () => {
  it('renders of builtin comparators', () => {
    const onChangeSelectedThreshold = jest.fn();
    const onChangeSelectedThresholdComparator = jest.fn();
    const wrapper = shallow(
      <ThresholdExpression
        thresholdComparator={'between'}
        errors={{ threshold0: [] }}
        onChangeSelectedThreshold={onChangeSelectedThreshold}
        onChangeSelectedThresholdComparator={onChangeSelectedThresholdComparator}
      />
    );
    expect(wrapper.find('[data-test-subj="comparatorOptionsComboBox"]')).toMatchInlineSnapshot(`
    <EuiSelect
      data-test-subj="comparatorOptionsComboBox"
      onChange={[Function]}
      options={
        Array [
          Object {
            "text": "Is above",
            "value": ">",
          },
          Object {
            "text": "Is above or equals",
            "value": ">=",
          },
          Object {
            "text": "Is below",
            "value": "<",
          },
          Object {
            "text": "Is below or equals",
            "value": "<=",
          },
          Object {
            "text": "Is between",
            "value": "between",
          },
        ]
      }
      value="between"
    />
    `);
  });

  it('renders with treshold title', () => {
    const onChangeSelectedThreshold = jest.fn();
    const onChangeSelectedThresholdComparator = jest.fn();
    const wrapper = shallow(
      <ThresholdExpression
        thresholdComparator={'between'}
        errors={{ threshold0: [] }}
        onChangeSelectedThreshold={onChangeSelectedThreshold}
        onChangeSelectedThresholdComparator={onChangeSelectedThresholdComparator}
      />
    );
    expect(wrapper.contains(<EuiPopoverTitle>Is between</EuiPopoverTitle>)).toBeTruthy();
  });
});
