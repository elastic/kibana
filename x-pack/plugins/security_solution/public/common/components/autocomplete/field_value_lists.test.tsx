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
import { waitFor } from '@testing-library/react';

import { getField } from '../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks';
import { ListSchema } from '../../../lists_plugin_deps';
import { getFoundListSchemaMock } from '../../../../../lists/common/schemas/response/found_list_schema.mock';
import { getListResponseMock } from '../../../../../lists/common/schemas/response/list_schema.mock';
import { DATE_NOW, VERSION, IMMUTABLE } from '../../../../../lists/common/constants.mock';

import { AutocompleteFieldListsComponent } from './field_value_lists';

jest.mock('../../../common/lib/kibana');
const mockStart = jest.fn();
const mockKeywordList: ListSchema = {
  ...getListResponseMock(),
  id: 'keyword_list',
  type: 'keyword',
  name: 'keyword list',
};
const mockResult = { ...getFoundListSchemaMock() };
mockResult.data = [...mockResult.data, mockKeywordList];
jest.mock('../../../lists_plugin_deps', () => {
  const originalModule = jest.requireActual('../../../lists_plugin_deps');

  return {
    ...originalModule,
    useFindLists: () => ({
      loading: false,
      start: mockStart.mockReturnValue(mockResult),
      result: mockResult,
      error: undefined,
    }),
  };
});

describe('AutocompleteFieldListsComponent', () => {
  test('it renders disabled if "isDisabled" is true', async () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AutocompleteFieldListsComponent
          placeholder="Placeholder text"
          selectedField={getField('ip')}
          selectedValue="some-list-id"
          isLoading={false}
          isClearable={true}
          isDisabled
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper
        .find(`[data-test-subj="valuesAutocompleteComboBox listsComboxBox"] input`)
        .prop('disabled')
    ).toBeTruthy();
  });

  test('it renders loading if "isLoading" is true', async () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AutocompleteFieldListsComponent
          placeholder="Placeholder text"
          selectedField={getField('@tags')}
          selectedValue=""
          isLoading
          isClearable={false}
          isDisabled={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper
      .find(`[data-test-subj="valuesAutocompleteComboBox listsComboxBox"] button`)
      .at(0)
      .simulate('click');
    expect(
      wrapper
        .find(
          `EuiComboBoxOptionsList[data-test-subj="valuesAutocompleteComboBox listsComboxBox-optionsList"]`
        )
        .prop('isLoading')
    ).toBeTruthy();
  });

  test('it allows user to clear values if "isClearable" is true', async () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AutocompleteFieldListsComponent
          placeholder="Placeholder text"
          selectedField={getField('ip')}
          selectedValue=""
          isLoading={false}
          isClearable={false}
          isDisabled={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );
    expect(
      wrapper
        .find('EuiComboBox[data-test-subj="valuesAutocompleteComboBox listsComboxBox"]')
        .prop('options')
    ).toEqual([{ label: 'some name' }]);
  });

  test('it correctly displays lists that match the selected "keyword" field esType', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AutocompleteFieldListsComponent
          placeholder="Placeholder text"
          selectedField={getField('@tags')}
          selectedValue=""
          isLoading={false}
          isClearable={false}
          isDisabled={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="comboBoxToggleListButton"] button').simulate('click');

    expect(
      wrapper
        .find('EuiComboBox[data-test-subj="valuesAutocompleteComboBox listsComboxBox"]')
        .prop('options')
    ).toEqual([{ label: 'keyword list' }]);
  });

  test('it correctly displays lists that match the selected "ip" field esType', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AutocompleteFieldListsComponent
          placeholder="Placeholder text"
          selectedField={getField('ip')}
          selectedValue=""
          isLoading={false}
          isClearable={false}
          isDisabled={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="comboBoxToggleListButton"] button').simulate('click');

    expect(
      wrapper
        .find('EuiComboBox[data-test-subj="valuesAutocompleteComboBox listsComboxBox"]')
        .prop('options')
    ).toEqual([{ label: 'some name' }]);
  });

  test('it correctly displays selected list', async () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AutocompleteFieldListsComponent
          placeholder="Placeholder text"
          selectedField={getField('ip')}
          selectedValue="some-list-id"
          isLoading={false}
          isClearable={false}
          isDisabled={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper
        .find(`[data-test-subj="valuesAutocompleteComboBox listsComboxBox"] EuiComboBoxPill`)
        .at(0)
        .text()
    ).toEqual('some name');
  });

  test('it invokes "onChange" when option selected', async () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AutocompleteFieldListsComponent
          placeholder="Placeholder text"
          selectedField={getField('ip')}
          selectedValue=""
          isLoading={false}
          isClearable={false}
          isDisabled={false}
          onChange={mockOnChange}
        />
      </ThemeProvider>
    );

    ((wrapper.find(EuiComboBox).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'some name' }]);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith({
        created_at: DATE_NOW,
        created_by: 'some user',
        description: 'some description',
        id: 'some-list-id',
        meta: {},
        name: 'some name',
        tie_breaker_id: '6a76b69d-80df-4ab2-8c3e-85f466b06a0e',
        type: 'ip',
        updated_at: DATE_NOW,
        updated_by: 'some user',
        _version: undefined,
        version: VERSION,
        deserializer: undefined,
        serializer: undefined,
        immutable: IMMUTABLE,
      });
    });
  });
});
