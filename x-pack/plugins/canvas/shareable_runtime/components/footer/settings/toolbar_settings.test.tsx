/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { JestContext } from '../../../test/context_jest';
import { getToolbarCheckbox as checkbox } from '../../../test/selectors';
import { ToolbarSettings } from './toolbar_settings';

jest.mock('../../../supported_renderers');

describe('<ToolbarSettings />', () => {
  const wrapper = mount(
    <JestContext>
      <ToolbarSettings onSetAutohide={() => {}} />
    </JestContext>
  );

  test('renders as expected', () => {
    expect(checkbox(wrapper).props()['aria-checked']).toEqual(false);
  });

  test('activates and deactivates', () => {
    checkbox(wrapper).simulate('click');
    expect(checkbox(wrapper).props()['aria-checked']).toEqual(true);
    checkbox(wrapper).simulate('click');
    expect(checkbox(wrapper).props()['aria-checked']).toEqual(false);
  });
});
