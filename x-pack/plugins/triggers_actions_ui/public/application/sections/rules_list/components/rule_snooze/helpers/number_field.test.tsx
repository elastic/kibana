/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { NumberField } from './number_field';

describe('NumberField', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    onChange.mockReset();
  });

  test('allows any value with no defined min or max', () => {
    const wrapper = mountWithIntl(<NumberField onChange={onChange} />);
    wrapper
      .find('input')
      .first()
      .simulate('change', { target: { value: 3 } });

    expect(onChange).toHaveBeenCalledWith(3);

    wrapper
      .find('input')
      .first()
      .simulate('change', { target: { value: 0 } });

    expect(onChange).toHaveBeenCalledWith(0);
  });

  test('constrains value to defined min', () => {
    const wrapper = mountWithIntl(<NumberField min={0} onChange={onChange} />);
    wrapper
      .find('input')
      .first()
      .simulate('change', { target: { value: 1 } });

    expect(onChange).toHaveBeenCalledWith(1);

    wrapper
      .find('input')
      .first()
      .simulate('change', { target: { value: -1 } });

    expect(onChange).not.toHaveBeenCalledWith(-1);
  });

  test('constrains value to defined max', () => {
    const wrapper = mountWithIntl(<NumberField max={10} onChange={onChange} />);
    wrapper
      .find('input')
      .first()
      .simulate('change', { target: { value: -1 } });

    expect(onChange).toHaveBeenCalledWith(-1);

    wrapper
      .find('input')
      .first()
      .simulate('change', { target: { value: 11 } });

    expect(onChange).not.toHaveBeenCalledWith(11);
  });
});
