/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { mount } from 'enzyme';

import { EuiSelect } from '@elastic/eui';

import { SelectInterval } from './select_interval';

describe('SelectInterval', () => {
  test('creates correct initial selected value', () => {
    const wrapper = mount(
      <MemoryRouter>
        <SelectInterval />
      </MemoryRouter>
    );
    const select = wrapper.find(EuiSelect);

    const defaultSelectedValue = select.props().value;
    expect(defaultSelectedValue).toBe('auto');
  });

  test('currently selected value is updated correctly on click', done => {
    const wrapper = mount(
      <MemoryRouter>
        <SelectInterval />
      </MemoryRouter>
    );
    const select = wrapper.find(EuiSelect).first();
    const defaultSelectedValue = select.props().value;
    expect(defaultSelectedValue).toBe('auto');

    const onChange = select.props().onChange;

    act(() => {
      if (onChange !== undefined) {
        onChange({ target: { value: 'day' } } as React.ChangeEvent<HTMLSelectElement>);
      }
    });

    setImmediate(() => {
      wrapper.update();
      const updatedSelect = wrapper.find(EuiSelect).first();
      const updatedSelectedValue = updatedSelect.props().value;
      expect(updatedSelectedValue).toBe('day');
      done();
    });
  });
});
