/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { shallow } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { ValueExpression } from './value';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';

describe('value expression', () => {
  it('renders description and value', () => {
    const wrapper = shallow(
      <ValueExpression
        description="test"
        value={1000}
        errors={[]}
        onChangeSelectedValue={jest.fn()}
      />
    );
    expect(wrapper.find('[data-test-subj="valueFieldTitle"]')).toMatchInlineSnapshot(`
    <ClosablePopoverTitle
      data-test-subj="valueFieldTitle"
      onClose={[Function]}
    >
      test
    </ClosablePopoverTitle>
    `);
    expect(wrapper.find('[data-test-subj="valueFieldNumberForm"]')).toMatchInlineSnapshot(`
    <EuiFormRow
      data-test-subj="valueFieldNumberForm"
      describedByIds={Array []}
      display="row"
      error={Array []}
      fullWidth={false}
      hasChildLabel={true}
      hasEmptyLabelSpace={false}
      isInvalid={false}
      labelType="label"
    >
      <EuiFieldNumber
        data-test-subj="valueFieldNumber"
        isInvalid={false}
        min={0}
        onChange={[Function]}
        value={1000}
      />
    </EuiFormRow>
    `);
  });

  it('renders errors', () => {
    const wrapper = shallow(
      <ValueExpression
        description="test"
        value={1000}
        errors={['value is not valid']}
        onChangeSelectedValue={jest.fn()}
      />
    );
    expect(wrapper.find('[data-test-subj="valueFieldNumberForm"]')).toMatchInlineSnapshot(`
    <EuiFormRow
      data-test-subj="valueFieldNumberForm"
      describedByIds={Array []}
      display="row"
      error={
        Array [
          "value is not valid",
        ]
      }
      fullWidth={false}
      hasChildLabel={true}
      hasEmptyLabelSpace={false}
      isInvalid={true}
      labelType="label"
    >
      <EuiFieldNumber
        data-test-subj="valueFieldNumber"
        isInvalid={true}
        min={0}
        onChange={[Function]}
        value={1000}
      />
    </EuiFormRow>
    `);
  });

  it('renders closed popover initially and opens on click', async () => {
    const wrapper = mountWithIntl(
      <ValueExpression
        description="test"
        value={1000}
        errors={[]}
        onChangeSelectedValue={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="valueExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="valueFieldTitle"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="valueFieldNumber"]').exists()).toBeFalsy();

    wrapper.find('[data-test-subj="valueExpression"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="valueFieldTitle"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="valueFieldNumber"]').exists()).toBeTruthy();
  });

  it('emits onChangeSelectedValue action when value is updated', async () => {
    const onChangeSelectedValue = jest.fn();
    const wrapper = mountWithIntl(
      <ValueExpression
        description="test"
        value={1000}
        errors={[]}
        onChangeSelectedValue={onChangeSelectedValue}
      />
    );

    wrapper.find('[data-test-subj="valueExpression"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    wrapper
      .find('input[data-test-subj="valueFieldNumber"]')
      .simulate('change', { target: { value: 3000 } });
    expect(onChangeSelectedValue).toHaveBeenCalledWith(3000);
  });
});
