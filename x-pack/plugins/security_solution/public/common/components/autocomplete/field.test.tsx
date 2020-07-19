/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import {
  fields,
  getField,
} from '../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks.ts';
import { FieldComponent } from './field';

describe('FieldComponent', () => {
  test('it renders disabled if "isDisabled" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <FieldComponent
          placeholder="Placeholder text"
          indexPattern={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          selectedField={getField('machine.os.raw')}
          isLoading={false}
          isClearable={false}
          isDisabled={true}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find(`[data-test-subj="fieldAutocompleteComboBox"] input`).prop('disabled')
    ).toBeTruthy();
  });

  test('it renders loading if "isLoading" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <FieldComponent
          placeholder="Placeholder text"
          indexPattern={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          selectedField={getField('machine.os.raw')}
          isLoading={true}
          isClearable={false}
          isDisabled={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );
    wrapper.find(`[data-test-subj="fieldAutocompleteComboBox"] button`).at(0).simulate('click');
    expect(
      wrapper
        .find(`EuiComboBoxOptionsList[data-test-subj="fieldAutocompleteComboBox-optionsList"]`)
        .prop('isLoading')
    ).toBeTruthy();
  });

  test('it allows user to clear values if "isClearable" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <FieldComponent
          placeholder="Placeholder text"
          indexPattern={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          selectedField={getField('machine.os.raw')}
          isLoading={false}
          isClearable={true}
          isDisabled={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper
        .find(`[data-test-subj="comboBoxInput"]`)
        .hasClass('euiComboBox__inputWrap-isClearable')
    ).toBeTruthy();
  });

  test('it correctly displays selected field', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <FieldComponent
          placeholder="Placeholder text"
          indexPattern={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          selectedField={getField('machine.os.raw')}
          isLoading={false}
          isClearable={false}
          isDisabled={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find(`[data-test-subj="fieldAutocompleteComboBox"] EuiComboBoxPill`).at(0).text()
    ).toEqual('machine.os.raw');
  });

  test('it invokes "onChange" when option selected', () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <FieldComponent
          placeholder="Placeholder text"
          indexPattern={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          selectedField={getField('machine.os.raw')}
          isLoading={false}
          isClearable={false}
          isDisabled={false}
          onChange={mockOnChange}
        />
      </ThemeProvider>
    );

    ((wrapper.find(EuiComboBox).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'machine.os' }]);

    expect(mockOnChange).toHaveBeenCalledWith([
      {
        aggregatable: true,
        count: 0,
        esTypes: ['text'],
        name: 'machine.os',
        readFromDocValues: false,
        scripted: false,
        searchable: true,
        type: 'string',
      },
    ]);
  });
});
