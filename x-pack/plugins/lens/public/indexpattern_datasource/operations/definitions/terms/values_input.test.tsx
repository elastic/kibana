/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { shallow } from 'enzyme';
import { EuiFieldNumber } from '@elastic/eui';
import { ValuesInput } from './values_input';

jest.mock('react-use/lib/useDebounce', () => (fn: () => void) => fn());

describe('Values', () => {
  it('should render EuiFieldNumber correctly', () => {
    const onChangeSpy = jest.fn();
    const instance = shallow(<ValuesInput value={5} onChange={onChangeSpy} />);

    expect(instance.find(EuiFieldNumber).prop('value')).toEqual('5');
  });

  it('should not run onChange function on mount', () => {
    const onChangeSpy = jest.fn();
    shallow(<ValuesInput value={5} onChange={onChangeSpy} />);

    expect(onChangeSpy.mock.calls.length).toBe(0);
  });

  it('should run onChange function on update', () => {
    const onChangeSpy = jest.fn();
    const instance = shallow(<ValuesInput value={5} onChange={onChangeSpy} />);
    act(() => {
      instance.find(EuiFieldNumber).prop('onChange')!({
        currentTarget: { value: '7' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(instance.find(EuiFieldNumber).prop('value')).toEqual('7');
    expect(onChangeSpy.mock.calls.length).toBe(1);
    expect(onChangeSpy.mock.calls[0][0]).toBe(7);
  });

  it('should not run onChange function on update when value is out of 1-100 range', () => {
    const onChangeSpy = jest.fn();
    const instance = shallow(<ValuesInput value={5} onChange={onChangeSpy} />);
    act(() => {
      instance.find(EuiFieldNumber).prop('onChange')!({
        currentTarget: { value: '1007' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    instance.update();
    expect(instance.find(EuiFieldNumber).prop('value')).toEqual('1007');
    expect(onChangeSpy.mock.calls.length).toBe(1);
    expect(onChangeSpy.mock.calls[0][0]).toBe(1000);
  });
});
