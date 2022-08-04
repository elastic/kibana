/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText } from '@elastic/eui';
import { mount } from 'enzyme';
import { InputWithDefault } from './input_with_default';
import { act } from 'react-dom/test-utils';

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});

describe('InputWithDefault', () => {
  it('should render', () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <InputWithDefault value={'my value'} onChange={mockOnChange} defaultValue={'default value'} />
    );

    const textProps = wrapper.find(EuiFieldText).props();
    expect(textProps.value).toBe('my value');
    expect(textProps.placeholder).toBe('default value');

    act(() => {
      textProps.onChange!({
        target: { value: 'new value' },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });
    expect(mockOnChange).toHaveBeenCalledWith('new value');
  });

  it('should update placeholder when default value changes', () => {
    const wrapper = mount(
      <InputWithDefault value={'my value'} onChange={() => {}} defaultValue={'old default'} />
    );

    expect(wrapper.find(EuiFieldText).props().placeholder).toBe('old default');

    act(() => {
      wrapper.setProps({ defaultValue: 'new default' });
    });

    expect(wrapper.find(EuiFieldText).props().placeholder).toBe('new default');
  });

  it('should forward text field props', () => {
    const wrapper = mount(
      <InputWithDefault
        compressed
        fullWidth
        readOnly
        value={'my value'}
        onChange={() => {}}
        defaultValue={'old default'}
      />
    );

    expect(wrapper.find(EuiFieldText).props()).toEqual(
      expect.objectContaining({
        compressed: true,
        fullWidth: true,
        readOnly: true,
      })
    );
  });
});
