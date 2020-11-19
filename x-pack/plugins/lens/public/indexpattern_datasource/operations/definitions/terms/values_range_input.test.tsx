/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { shallow } from 'enzyme';
import { EuiRange } from '@elastic/eui';
import { ValuesRangeInput } from './values_range_input';

jest.mock('react-use/lib/useDebounce', () => (fn: () => void) => fn());

describe('ValuesRangeInput', () => {
  it('should render EuiRange correctly', () => {
    const onChangeSpy = jest.fn();
    const instance = shallow(<ValuesRangeInput value={5} onChange={onChangeSpy} />);

    expect(instance.find(EuiRange).prop('value')).toEqual('5');
  });

  it('should not run onChange function on mount', () => {
    const onChangeSpy = jest.fn();
    shallow(<ValuesRangeInput value={5} onChange={onChangeSpy} />);

    expect(onChangeSpy.mock.calls.length).toBe(0);
  });

  it('should run onChange function on update', () => {
    const onChangeSpy = jest.fn();
    const instance = shallow(<ValuesRangeInput value={5} onChange={onChangeSpy} />);
    act(() => {
      instance.find(EuiRange).prop('onChange')!(
        { currentTarget: { value: '7' } } as React.ChangeEvent<HTMLInputElement>,
        true
      );
    });
    expect(instance.find(EuiRange).prop('value')).toEqual('7');
    expect(onChangeSpy.mock.calls.length).toBe(1);
    expect(onChangeSpy.mock.calls[0][0]).toBe(7);
  });

  it('should not run onChange function on update when value is out of 1-100 range', () => {
    const onChangeSpy = jest.fn();
    const instance = shallow(<ValuesRangeInput value={5} onChange={onChangeSpy} />);
    act(() => {
      instance.find(EuiRange).prop('onChange')!(
        { currentTarget: { value: '107' } } as React.ChangeEvent<HTMLInputElement>,
        true
      );
    });
    instance.update();
    expect(instance.find(EuiRange).prop('value')).toEqual('107');
    expect(onChangeSpy.mock.calls.length).toBe(1);
    expect(onChangeSpy.mock.calls[0][0]).toBe(100);
  });
});
