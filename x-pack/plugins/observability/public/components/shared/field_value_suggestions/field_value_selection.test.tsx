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
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';

const values = [
  { label: 'elastic co frontend', count: 1 },
  { label: 'apm server', count: 2 },
];

describe('FieldValueSelection', () => {
  it('renders a label for button', async () => {
    const wrapper = render(
      <FieldValueSelection
        label="Service name"
        values={values}
        onChange={() => {}}
        selectedValue={[]}
        loading={false}
        setQuery={() => {}}
      />
    );

    const btn = wrapper.find('[data-test-subj=fieldValueSelectionBtn]');

    expect(btn.text()).toBe('Service name');
  });

  it('renders a list on click', async () => {
    const wrapper = mount(
      <EuiThemeProvider>
        <FieldValueSelection
          label="Service name"
          values={values}
          onChange={() => {}}
          selectedValue={[]}
          loading={false}
          setQuery={() => {}}
        />
      </EuiThemeProvider>
    );

    const btn = wrapper.find(EuiButton);
    btn.simulate('click');

    const list = wrapper.find(EuiSelectableList);

    expect((list.props() as any).visibleOptions).toMatchInlineSnapshot(`
      Array [
        Object {
          "append": <styled.div>
            <EuiText
              size="xs"
            >
              1
            </EuiText>
          </styled.div>,
          "label": "elastic co frontend",
        },
        Object {
          "append": <styled.div>
            <EuiText
              size="xs"
            >
              2
            </EuiText>
          </styled.div>,
          "label": "apm server",
        },
      ]
    `);
  });
});
