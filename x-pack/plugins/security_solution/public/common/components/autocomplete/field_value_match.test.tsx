/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount, ReactWrapper } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { EuiSuperSelect, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { act } from '@testing-library/react';

import {
  fields,
  getField,
} from '../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks';
import { AutocompleteFieldMatchComponent } from './field_value_match';
import { useFieldValueAutocomplete } from './hooks/use_field_value_autocomplete';

jest.mock('./hooks/use_field_value_autocomplete');

describe('AutocompleteFieldMatchComponent', () => {
  let wrapper: ReactWrapper;

  const getValueSuggestionsMock = jest
    .fn()
    .mockResolvedValue([false, true, ['value 3', 'value 4'], jest.fn()]);

  beforeEach(() => {
    (useFieldValueAutocomplete as jest.Mock).mockReturnValue([
      false,
      true,
      ['value 1', 'value 2'],
      getValueSuggestionsMock,
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
    wrapper.unmount();
  });

  test('it renders row label if one passed in', () => {
    wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AutocompleteFieldMatchComponent
          rowLabel={'Row Label'}
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
          isDisabled
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="valuesAutocompleteMatchLabel"] label').at(0).text()
    ).toEqual('Row Label');
  });

  test('it renders disabled if "isDisabled" is true', () => {
    wrapper = mount(
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
          isDisabled
          onChange={jest.fn()}
          onError={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="valuesAutocompleteMatch"] input').prop('disabled')
    ).toBeTruthy();
  });

  test('it renders loading if "isLoading" is true', () => {
    wrapper = mount(
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
          isLoading
          isClearable={false}
          isDisabled={false}
          onChange={jest.fn()}
          onError={jest.fn()}
        />
      </ThemeProvider>
    );
    wrapper.find('[data-test-subj="valuesAutocompleteMatch"] button').at(0).simulate('click');
    expect(
      wrapper
        .find('EuiComboBoxOptionsList[data-test-subj="valuesAutocompleteMatch-optionsList"]')
        .prop('isLoading')
    ).toBeTruthy();
  });

  test('it allows user to clear values if "isClearable" is true', () => {
    wrapper = mount(
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
          onError={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper
        .find('[data-test-subj="comboBoxInput"]')
        .hasClass('euiComboBox__inputWrap-isClearable')
    ).toBeTruthy();
  });

  test('it correctly displays selected value', () => {
    wrapper = mount(
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
          onError={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="valuesAutocompleteMatch"] EuiComboBoxPill').at(0).text()
    ).toEqual('126.45.211.34');
  });

  test('it invokes "onChange" when new value created', async () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
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
          onError={jest.fn()}
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
    wrapper = mount(
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
          onError={jest.fn()}
        />
      </ThemeProvider>
    );

    ((wrapper.find(EuiComboBox).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'value 1' }]);

    expect(mockOnChange).toHaveBeenCalledWith('value 1');
  });

  test('it refreshes autocomplete with search query when new value searched', () => {
    wrapper = mount(
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
          onChange={jest.fn()}
          onError={jest.fn()}
        />
      </ThemeProvider>
    );
    act(() => {
      ((wrapper.find(EuiComboBox).props() as unknown) as {
        onSearchChange: (a: string) => void;
      }).onSearchChange('value 1');
    });

    expect(useFieldValueAutocomplete).toHaveBeenCalledWith({
      selectedField: getField('machine.os.raw'),
      operatorType: 'match',
      query: 'value 1',
      fieldValue: '',
      indexPattern: {
        id: '1234',
        title: 'logstash-*',
        fields,
      },
    });
  });

  describe('boolean type', () => {
    const valueSuggestionsMock = jest.fn().mockResolvedValue([false, false, [], jest.fn()]);

    beforeEach(() => {
      (useFieldValueAutocomplete as jest.Mock).mockReturnValue([
        false,
        false,
        [],
        valueSuggestionsMock,
      ]);
    });

    test('it displays only two options - "true" or "false"', () => {
      wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <AutocompleteFieldMatchComponent
            placeholder="Placeholder text"
            selectedField={getField('ssl')}
            selectedValue=""
            indexPattern={{
              id: '1234',
              title: 'logstash-*',
              fields,
            }}
            isLoading={false}
            isClearable={false}
            isDisabled={false}
            onChange={jest.fn()}
            onError={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(
        wrapper.find('[data-test-subj="valuesAutocompleteMatchBoolean"]').exists()
      ).toBeTruthy();
      expect(
        wrapper.find('[data-test-subj="valuesAutocompleteMatchBoolean"]').at(0).prop('options')
      ).toEqual([
        {
          inputDisplay: 'true',
          value: 'true',
        },
        {
          inputDisplay: 'false',
          value: 'false',
        },
      ]);
    });

    test('it invokes "onChange" with "true" when selected', () => {
      const mockOnChange = jest.fn();
      wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <AutocompleteFieldMatchComponent
            placeholder="Placeholder text"
            selectedField={getField('ssl')}
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
            onError={jest.fn()}
          />
        </ThemeProvider>
      );

      ((wrapper.find(EuiSuperSelect).props() as unknown) as {
        onChange: (a: string) => void;
      }).onChange('true');

      expect(mockOnChange).toHaveBeenCalledWith('true');
    });

    test('it invokes "onChange" with "false" when selected', () => {
      const mockOnChange = jest.fn();
      wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <AutocompleteFieldMatchComponent
            placeholder="Placeholder text"
            selectedField={getField('ssl')}
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
            onError={jest.fn()}
          />
        </ThemeProvider>
      );

      ((wrapper.find(EuiSuperSelect).props() as unknown) as {
        onChange: (a: string) => void;
      }).onChange('false');

      expect(mockOnChange).toHaveBeenCalledWith('false');
    });
  });

  describe('number type', () => {
    const valueSuggestionsMock = jest.fn().mockResolvedValue([false, false, [], jest.fn()]);

    beforeEach(() => {
      (useFieldValueAutocomplete as jest.Mock).mockReturnValue([
        false,
        false,
        [],
        valueSuggestionsMock,
      ]);
    });

    test('it number input when field type is number', () => {
      wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <AutocompleteFieldMatchComponent
            placeholder="Placeholder text"
            selectedField={getField('bytes')}
            selectedValue=""
            indexPattern={{
              id: '1234',
              title: 'logstash-*',
              fields,
            }}
            isLoading={false}
            isClearable={false}
            isDisabled={false}
            onChange={jest.fn()}
            onError={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(
        wrapper.find('[data-test-subj="valueAutocompleteFieldMatchNumber"]').exists()
      ).toBeTruthy();
    });

    test('it invokes "onChange" with numeric value when inputted', () => {
      const mockOnChange = jest.fn();
      wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <AutocompleteFieldMatchComponent
            placeholder="Placeholder text"
            selectedField={getField('bytes')}
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
            onError={jest.fn()}
          />
        </ThemeProvider>
      );

      wrapper
        .find('[data-test-subj="valueAutocompleteFieldMatchNumber"] input')
        .at(0)
        .simulate('change', { target: { value: '8' } });

      expect(mockOnChange).toHaveBeenCalledWith('8');
    });
  });
});
