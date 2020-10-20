/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { mount } from 'enzyme';

import { EuiLink } from '@elastic/eui';

import { useDidUpdateEffect } from './use_did_update_effect';

const fn = jest.fn();

const TestHook = ({ value }: { value: number }) => {
  const [inputValue, setValue] = useState(value);
  useDidUpdateEffect(fn, [inputValue]);
  return <EuiLink onClick={() => setValue(2)} />;
};

const wrapper = mount(<TestHook value={1} />);

describe('useDidUpdateEffect', () => {
  it('should not fire function when value unchanged', () => {
    expect(fn).not.toHaveBeenCalled();
  });

  it('should fire function when value changed', () => {
    wrapper.find(EuiLink).simulate('click');
    expect(fn).toHaveBeenCalled();
  });
});
