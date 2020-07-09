/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { mount } from 'enzyme';

import { EuiSuperSelect } from '@elastic/eui';

import { UrlStateProvider } from '../../../util/url_state';

import { SelectSeverity } from './select_severity';

describe('SelectSeverity', () => {
  test('creates correct severity options and initial selected value', () => {
    const wrapper = mount(
      <MemoryRouter>
        <UrlStateProvider>
          <SelectSeverity />
        </UrlStateProvider>
      </MemoryRouter>
    );
    const select = wrapper.find(EuiSuperSelect);

    const options = select.props().options;
    const defaultSelectedValue = select.props().valueOfSelected;

    expect(defaultSelectedValue).toBe('warning');
    expect(options.length).toEqual(4);

    // excpect options Array to equal Array containing Object that contains the property
    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'warning',
        }),
      ])
    );

    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'minor',
        }),
      ])
    );

    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'major',
        }),
      ])
    );

    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'critical',
        }),
      ])
    );
  });

  test('state for currently selected value is updated correctly on click', (done) => {
    const wrapper = mount(
      <MemoryRouter>
        <UrlStateProvider>
          <SelectSeverity />
        </UrlStateProvider>
      </MemoryRouter>
    );

    const select = wrapper.find(EuiSuperSelect).first();
    const defaultSelectedValue = select.props().valueOfSelected;
    expect(defaultSelectedValue).toBe('warning');

    const onChange = select.props().onChange;

    act(() => {
      if (onChange !== undefined) {
        onChange('critical');
      }
    });

    setImmediate(() => {
      wrapper.update();
      const updatedSelect = wrapper.find(EuiSuperSelect).first();
      const updatedSelectedValue = updatedSelect.props().valueOfSelected;
      expect(updatedSelectedValue).toBe('critical');
      done();
    });
  });
});
