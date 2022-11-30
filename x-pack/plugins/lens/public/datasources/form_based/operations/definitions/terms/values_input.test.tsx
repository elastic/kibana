/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { shallow } from 'enzyme';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
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
      instance.find(EuiFieldNumber).simulate('change', { currentTarget: { value: '7' } });
    });
    expect(instance.find(EuiFieldNumber).prop('value')).toEqual('7');
    expect(onChangeSpy.mock.calls.length).toBe(1);
    expect(onChangeSpy.mock.calls[0][0]).toBe(7);
  });

  it('should not run onChange function on update when value is out of 1-10000 range', () => {
    const onChangeSpy = jest.fn();
    const instance = shallow(<ValuesInput value={5} onChange={onChangeSpy} />);
    act(() => {
      instance.find(EuiFieldNumber).simulate('change', { currentTarget: { value: '10007' } });
    });
    instance.update();
    expect(instance.find(EuiFieldNumber).prop('value')).toEqual('10007');
    expect(onChangeSpy.mock.calls.length).toBe(1);
    expect(onChangeSpy.mock.calls[0][0]).toBe(10000);
  });

  it('should show an error message when the value is out of bounds', () => {
    const instance = shallow(<ValuesInput value={-5} onChange={jest.fn()} />);

    expect(instance.find(EuiFieldNumber).prop('isInvalid')).toBeTruthy();
    expect(instance.find(EuiFormRow).prop('error')).toEqual(
      expect.arrayContaining([expect.stringMatching('Value is lower')])
    );

    act(() => {
      instance.find(EuiFieldNumber).simulate('change', { currentTarget: { value: '10007' } });
    });
    instance.update();

    expect(instance.find(EuiFieldNumber).prop('isInvalid')).toBeTruthy();
    expect(instance.find(EuiFormRow).prop('error')).toEqual(
      expect.arrayContaining([expect.stringMatching('Value is higher')])
    );
  });

  it('should fallback to last valid value on input blur', () => {
    const instance = shallow(<ValuesInput value={123} onChange={jest.fn()} />);

    function changeAndBlur(newValue: string) {
      act(() => {
        instance.find(EuiFieldNumber).simulate('change', {
          currentTarget: { value: newValue },
        });
      });
      instance.update();
      act(() => {
        instance.find(EuiFieldNumber).simulate('blur');
      });
      instance.update();
    }

    changeAndBlur('-5');

    expect(instance.find(EuiFieldNumber).prop('isInvalid')).toBeFalsy();
    expect(instance.find(EuiFieldNumber).prop('value')).toBe('1');

    changeAndBlur('50000');

    expect(instance.find(EuiFieldNumber).prop('isInvalid')).toBeFalsy();
    expect(instance.find(EuiFieldNumber).prop('value')).toBe('10000');

    changeAndBlur('');
    // as we're not handling the onChange state, it fallbacks to the value prop
    expect(instance.find(EuiFieldNumber).prop('value')).toBe('123');
  });
});
