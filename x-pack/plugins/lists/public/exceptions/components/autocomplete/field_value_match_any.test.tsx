/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ReactWrapper, mount } from 'enzyme';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { act } from '@testing-library/react';

import {
  fields,
  getField,
} from '../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';

import { AutocompleteFieldMatchAnyComponent } from './field_value_match_any';
import { useFieldValueAutocomplete } from './hooks/use_field_value_autocomplete';

const { autocomplete: autocompleteStartMock } = dataPluginMock.createStartContract();

jest.mock('./hooks/use_field_value_autocomplete');

describe('AutocompleteFieldMatchAnyComponent', () => {
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

  test('it renders disabled if "isDisabled" is true', () => {
    wrapper = mount(
      <AutocompleteFieldMatchAnyComponent
        autocompleteService={{
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        }}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={true}
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        placeholder="Placeholder text"
        rowLabel={'Row Label'}
        selectedField={getField('ip')}
        selectedValue={['126.45.211.34']}
      />
    );

    expect(
      wrapper.find(`[data-test-subj="valuesAutocompleteMatchAny"] input`).prop('disabled')
    ).toBeTruthy();
  });

  test('it renders loading if "isLoading" is true', () => {
    wrapper = mount(
      <AutocompleteFieldMatchAnyComponent
        autocompleteService={{
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        }}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={true}
        onChange={jest.fn()}
        onError={jest.fn()}
        placeholder="Placeholder text"
        rowLabel={'Row Label'}
        selectedField={getField('ip')}
        selectedValue={[]}
      />
    );
    wrapper.find(`[data-test-subj="valuesAutocompleteMatchAny"] button`).at(0).simulate('click');
    expect(
      wrapper
        .find(`EuiComboBoxOptionsList[data-test-subj="valuesAutocompleteMatchAny-optionsList"]`)
        .prop('isLoading')
    ).toBeTruthy();
  });

  test('it allows user to clear values if "isClearable" is true', () => {
    wrapper = mount(
      <AutocompleteFieldMatchAnyComponent
        autocompleteService={{
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        }}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={true}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        placeholder="Placeholder text"
        rowLabel={'Row Label'}
        selectedField={getField('ip')}
        selectedValue={['126.45.211.34']}
      />
    );

    expect(
      wrapper
        .find(`[data-test-subj="comboBoxInput"]`)
        .hasClass('euiComboBox__inputWrap-isClearable')
    ).toBeTruthy();
  });

  test('it correctly displays selected value', () => {
    wrapper = mount(
      <AutocompleteFieldMatchAnyComponent
        autocompleteService={{
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        }}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        placeholder="Placeholder text"
        rowLabel={'Row Label'}
        selectedField={getField('ip')}
        selectedValue={['126.45.211.34']}
      />
    );

    expect(
      wrapper.find(`[data-test-subj="valuesAutocompleteMatchAny"] EuiComboBoxPill`).at(0).text()
    ).toEqual('126.45.211.34');
  });

  test('it invokes "onChange" when new value created', async () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
      <AutocompleteFieldMatchAnyComponent
        autocompleteService={{
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        }}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={mockOnChange}
        onError={jest.fn()}
        placeholder="Placeholder text"
        rowLabel={'Row Label'}
        selectedField={getField('ip')}
        selectedValue={[]}
      />
    );

    ((wrapper.find(EuiComboBox).props() as unknown) as {
      onCreateOption: (a: string) => void;
    }).onCreateOption('126.45.211.34');

    expect(mockOnChange).toHaveBeenCalledWith(['126.45.211.34']);
  });

  test('it invokes "onChange" when new value selected', async () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
      <AutocompleteFieldMatchAnyComponent
        autocompleteService={{
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        }}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isLoading={false}
        isClearable={false}
        isDisabled={false}
        onChange={mockOnChange}
        onError={jest.fn()}
        placeholder="Placeholder text"
        rowLabel={'Row Label'}
        selectedField={getField('machine.os.raw')}
        selectedValue={[]}
      />
    );

    ((wrapper.find(EuiComboBox).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'value 1' }]);

    expect(mockOnChange).toHaveBeenCalledWith(['value 1']);
  });

  test('it refreshes autocomplete with search query when new value searched', () => {
    wrapper = mount(
      <AutocompleteFieldMatchAnyComponent
        autocompleteService={{
          ...autocompleteStartMock,
        }}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        placeholder="Placeholder text"
        rowLabel={'Row Label'}
        selectedField={getField('machine.os.raw')}
        selectedValue={[]}
      />
    );
    act(() => {
      ((wrapper.find(EuiComboBox).props() as unknown) as {
        onSearchChange: (a: string) => void;
      }).onSearchChange('value 1');
    });
    expect(useFieldValueAutocomplete).toHaveBeenCalledWith({
      autocompleteService: autocompleteStartMock,
      fieldValue: [],
      indexPattern: {
        fields,
        id: '1234',
        title: 'logstash-*',
      },
      operatorType: 'match_any',
      query: 'value 1',
      selectedField: getField('machine.os.raw'),
    });
  });
});
