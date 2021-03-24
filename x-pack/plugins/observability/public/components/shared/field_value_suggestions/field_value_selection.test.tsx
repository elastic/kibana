/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, render } from 'enzyme';
import { FieldValueSelection } from './field_value_selection';
import { EuiButton, EuiSelectableList } from '@elastic/eui';

describe('FieldValueSelection', () => {
  it('renders a label for button', async () => {
    const wrapper = render(
      <FieldValueSelection
        label="Service name"
        values={['elastic co frontend', 'apm server', 'opbean python']}
        onChange={() => {}}
        value={''}
        loading={false}
        setQuery={() => {}}
      />
    );

    const btn = wrapper.find('[data-test-subj=fieldValueSelectionBtn]');

    expect(btn.text()).toBe('Service name');
  });
  it('renders a list on click', async () => {
    const wrapper = mount(
      <FieldValueSelection
        label="Service name"
        values={['elastic co frontend', 'apm server', 'opbean python']}
        onChange={() => {}}
        value={''}
        loading={false}
        setQuery={() => {}}
      />
    );

    const btn = wrapper.find(EuiButton);
    btn.simulate('click');

    const list = wrapper.find(EuiSelectableList);

    expect((list.props() as any).visibleOptions).toEqual([
      { label: 'elastic co frontend' },
      { label: 'apm server' },
      { label: 'opbean python' },
    ]);
  });
});
