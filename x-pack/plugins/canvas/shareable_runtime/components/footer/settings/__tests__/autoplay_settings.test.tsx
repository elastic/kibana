/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { JestContext } from '../../../../test/context_jest';
import {
  getAutoplayTextField as input,
  getAutoplayCheckbox as checkbox,
  getAutoplaySubmit as submit,
} from '../../../../test/selectors';
import { AutoplaySettings } from '../autoplay_settings';

jest.mock('../../../../supported_renderers');

describe('<AutoplaySettings />', () => {
  const wrapper = mount(
    <JestContext>
      <AutoplaySettings />
    </JestContext>
  );

  test('renders as expected', () => {
    expect(checkbox(wrapper).props()['aria-checked']).toEqual(false);
    expect(input(wrapper).props().value).toBe('5s');
  });

  test('activates and deactivates', () => {
    checkbox(wrapper).simulate('click');
    expect(checkbox(wrapper).props()['aria-checked']).toEqual(true);
    checkbox(wrapper).simulate('click');
    expect(checkbox(wrapper).props()['aria-checked']).toEqual(false);
  });

  test('changes properly with input', () => {
    input(wrapper).simulate('change', { target: { value: '2asd' } });
    expect(submit(wrapper).props().disabled).toEqual(true);
    input(wrapper).simulate('change', { target: { value: '2s' } });
    expect(submit(wrapper).props().disabled).toEqual(false);
    expect(input(wrapper).props().value === '2s');
    submit(wrapper).simulate('submit');
    expect(input(wrapper).props().value === '2s');
    expect(submit(wrapper).props().disabled).toEqual(false);
  });
});
