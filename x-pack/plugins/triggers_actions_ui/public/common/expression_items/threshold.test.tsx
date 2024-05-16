/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { shallow } from 'enzyme';
import { mountWithIntl } from '@kbn/test-jest-helpers';
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
            Object {
              "text": "Is not between",
              "value": "notBetween",
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

    wrapper.find('[data-test-subj="thresholdPopover"]').last().simulate('click');
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

  it('renders threshold unit correctly', async () => {
    const wrapper = mountWithIntl(
      <ThresholdExpression
        thresholdComparator={'>'}
        threshold={[10]}
        errors={{ threshold0: [], threshold1: [] }}
        onChangeSelectedThreshold={jest.fn()}
        onChangeSelectedThresholdComparator={jest.fn()}
        unit="%"
      />
    );

    expect(wrapper.find('[data-test-subj="thresholdPopover"]').last().text()).toMatchInlineSnapshot(
      `"Is above 10%"`
    );
  });

  it('renders the correct number of threshold inputs', async () => {
    const wrapper = mountWithIntl(
      <ThresholdExpression
        thresholdComparator={'>'}
        threshold={[10]}
        errors={{ threshold0: [], threshold1: [] }}
        onChangeSelectedThreshold={jest.fn()}
        onChangeSelectedThresholdComparator={jest.fn()}
      />
    );

    wrapper.find('[data-test-subj="thresholdPopover"]').last().simulate('click');
    expect(wrapper.find('[data-test-subj="comparatorOptionsComboBox"]').exists()).toBeTruthy();
    expect(wrapper.find('input[data-test-subj="alertThresholdInput"]').length).toEqual(1);

    wrapper
      .find('[data-test-subj="comparatorOptionsComboBox"]')
      .last()
      .simulate('change', { target: { value: 'between' } });
    wrapper.update();
    expect(wrapper.find('input[data-test-subj="alertThresholdInput"]').length).toEqual(2);

    wrapper
      .find('[data-test-subj="comparatorOptionsComboBox"]')
      .last()
      .simulate('change', { target: { value: '<' } });
    wrapper.update();
    expect(wrapper.find('input[data-test-subj="alertThresholdInput"]').length).toEqual(1);
  });

  it('is valid when the threshold value is 0', () => {
    const onChangeSelectedThreshold = jest.fn();
    const onChangeSelectedThresholdComparator = jest.fn();
    const wrapper = shallow(
      <ThresholdExpression
        thresholdComparator={'>'}
        threshold={[0]}
        errors={{ threshold0: [], threshold1: [] }}
        onChangeSelectedThreshold={onChangeSelectedThreshold}
        onChangeSelectedThresholdComparator={onChangeSelectedThresholdComparator}
      />
    );
    expect(wrapper.find('[data-test-subj="alertThresholdInput"]')).toMatchInlineSnapshot(`
          <EuiFieldNumber
            data-test-subj="alertThresholdInput"
            isInvalid={false}
            min={0}
            onChange={[Function]}
            value={0}
          />
        `);
  });
});
