/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { shallow } from 'enzyme';
import { mountWithIntl } from '@kbn/test/jest';
import { ThresholdExpression } from './threshold';

describe('threshold expression', () => {
  it('renders of builtin comparators', () => {
    const onChangeSelectedThreshold = jest.fn();
    const onChangeSelectedThresholdComparator = jest.fn();
    const wrapper = shallow(
      <ThresholdExpression
        thresholdComparator={'between'}
        errors={{ threshold0: [], threshold1: [] }}
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

  it('renders with threshold title', () => {
    const onChangeSelectedThreshold = jest.fn();
    const onChangeSelectedThresholdComparator = jest.fn();
    const wrapper = shallow(
      <ThresholdExpression
        thresholdComparator={'between'}
        errors={{ threshold0: [], threshold1: [] }}
        onChangeSelectedThreshold={onChangeSelectedThreshold}
        onChangeSelectedThresholdComparator={onChangeSelectedThresholdComparator}
      />
    );
    expect(wrapper.contains('Is between')).toBeTruthy();
  });

  it('fires onChangeSelectedThreshold only when threshold actually changed', async () => {
    const onChangeSelectedThreshold = jest.fn();
    const onChangeSelectedThresholdComparator = jest.fn();

    const wrapper = mountWithIntl(
      <ThresholdExpression
        thresholdComparator={'>'}
        threshold={[10]}
        errors={{ threshold0: [], threshold1: [] }}
        onChangeSelectedThreshold={onChangeSelectedThreshold}
        onChangeSelectedThresholdComparator={onChangeSelectedThresholdComparator}
      />
    );

    wrapper.find('[data-test-subj="thresholdPopover"]').first().simulate('click');
    expect(wrapper.find('[data-test-subj="comparatorOptionsComboBox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="alertThresholdInput"]').exists()).toBeTruthy();

    wrapper
      .find('[data-test-subj="alertThresholdInput"]')
      .last()
      .simulate('change', { target: { value: 1000 } });
    expect(onChangeSelectedThreshold).toHaveBeenCalled();
    expect(onChangeSelectedThresholdComparator).not.toHaveBeenCalled();

    jest.clearAllMocks();
    wrapper
      .find('[data-test-subj="comparatorOptionsComboBox"]')
      .last()
      .simulate('change', { target: { value: '<' } });
    expect(onChangeSelectedThreshold).not.toHaveBeenCalled();
    expect(onChangeSelectedThresholdComparator).toHaveBeenCalled();

    jest.clearAllMocks();
    wrapper
      .find('[data-test-subj="comparatorOptionsComboBox"]')
      .last()
      .simulate('change', { target: { value: 'between' } });
    expect(onChangeSelectedThreshold).toHaveBeenCalled();
    expect(onChangeSelectedThresholdComparator).toHaveBeenCalled();
  });
});
