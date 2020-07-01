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
import { AutocompleteFieldMatchComponent } from './field_value_match';
import { useFieldValueAutocomplete } from './hooks/use_field_value_autocomplete';
jest.mock('./hooks/use_field_value_autocomplete');

describe('AutocompleteFieldMatchComponent', () => {
  const getValueSuggestionsMock = jest
    .fn()
    .mockResolvedValue([false, ['value 3', 'value 4'], jest.fn()]);

  beforeAll(() => {
    (useFieldValueAutocomplete as jest.Mock).mockReturnValue([
      false,
      ['value 1', 'value 2'],
      getValueSuggestionsMock,
    ]);
  });
  test('it renders disabled if "isDisabled" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AutocompleteFieldMatchComponent
          placeholder="Placeholder text"
          selectedField={getField('ip')}
          selectedValue="126.45.211.34"
          indexPattern={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          isLoading={false}
          isClearable={false}
          isDisabled={true}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper
        .find(`[data-test-subj="valuesAutocompleteComboBox matchComboxBox"] input`)
        .prop('disabled')
    ).toBeTruthy();
  });

  test('it renders loading if "isLoading" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AutocompleteFieldMatchComponent
          placeholder="Placeholder text"
          selectedField={getField('ip')}
          selectedValue="126.45.211.34"
          indexPattern={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          isLoading={true}
          isClearable={false}
          isDisabled={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );
    wrapper
      .find(`[data-test-subj="valuesAutocompleteComboBox matchComboxBox"] button`)
      .at(0)
      .simulate('click');
    expect(
      wrapper
        .find(
          `EuiComboBoxOptionsList[data-test-subj="valuesAutocompleteComboBox matchComboxBox-optionsList"]`
        )
        .prop('isLoading')
    ).toBeTruthy();
  });

  test('it allows user to clear values if "isClearable" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AutocompleteFieldMatchComponent
          placeholder="Placeholder text"
          selectedField={getField('ip')}
          selectedValue="126.45.211.34"
          indexPattern={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
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

  test('it correctly displays selected value', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AutocompleteFieldMatchComponent
          placeholder="Placeholder text"
          selectedField={getField('ip')}
          selectedValue="126.45.211.34"
          indexPattern={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          isLoading={false}
          isClearable={false}
          isDisabled={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper
        .find(`[data-test-subj="valuesAutocompleteComboBox matchComboxBox"] EuiComboBoxPill`)
        .at(0)
        .text()
    ).toEqual('126.45.211.34');
  });

  test('it invokes "onChange" when new value created', async () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AutocompleteFieldMatchComponent
          placeholder="Placeholder text"
          selectedField={getField('ip')}
          selectedValue=""
          indexPattern={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          isLoading={false}
          isClearable={false}
          isDisabled={false}
          onChange={mockOnChange}
        />
      </ThemeProvider>
    );

    ((wrapper.find(EuiComboBox).props() as unknown) as {
      onCreateOption: (a: string) => void;
    }).onCreateOption('126.45.211.34');

    expect(mockOnChange).toHaveBeenCalledWith('126.45.211.34');
  });

  test('it invokes "onChange" when new value selected', async () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AutocompleteFieldMatchComponent
          placeholder="Placeholder text"
          selectedField={getField('machine.os.raw')}
          selectedValue=""
          indexPattern={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          isLoading={false}
          isClearable={false}
          isDisabled={false}
          onChange={mockOnChange}
        />
      </ThemeProvider>
    );

    ((wrapper.find(EuiComboBox).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'value 1' }]);

    expect(mockOnChange).toHaveBeenCalledWith('value 1');
  });

  test('it invokes updateSuggestions when new value searched', async () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AutocompleteFieldMatchComponent
          placeholder="Placeholder text"
          selectedField={getField('machine.os.raw')}
          selectedValue=""
          indexPattern={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          isLoading={false}
          isClearable={false}
          isDisabled={false}
          onChange={mockOnChange}
        />
      </ThemeProvider>
    );

    ((wrapper.find(EuiComboBox).props() as unknown) as {
      onSearchChange: (a: string) => void;
    }).onSearchChange('value 1');

    expect(getValueSuggestionsMock).toHaveBeenCalledWith({
      fieldSelected: getField('machine.os.raw'),
      patterns: {
        id: '1234',
        title: 'logstash-*',
        fields,
      },
      value: 'value 1',
      signal: new AbortController().signal,
    });
  });
});
