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
import { act } from 'react-dom/test-utils';

import { getField } from '../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks.ts';
import { AutocompleteFieldListsComponent } from './field_value_lists';
import { getFoundListSchemaMock } from '../../../../../lists/common/schemas/response/found_list_schema.mock';
import { getListResponseMock } from '../../../../../lists/common/schemas/response/list_schema.mock';
import { wait } from '../../../common/lib/helpers';

jest.mock('../../../common/lib/kibana');
const mockStart = jest.fn();
const mockKeywordList = getListResponseMock();
mockKeywordList.id = 'keyword_list';
mockKeywordList.type = 'keyword';
mockKeywordList.name = 'keyword list';
const mockResult = getFoundListSchemaMock();
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
  xtest('it renders disabled if "isDisabled" is true', async () => {
    await act(async () => {
      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <AutocompleteFieldListsComponent
            placeholder="Placeholder text"
            selectedField={getField('ip')}
            selectedValue="some-list-id"
            isLoading={false}
            isClearable={false}
            isDisabled={true}
            onChange={jest.fn()}
          />
        </ThemeProvider>
      );
      await wait();
      expect(
        wrapper
          .find(`[data-test-subj="valuesAutocompleteComboBox listsComboxBox"] input`)
          .prop('disabled')
      ).toBeTruthy();
    });
  });

  xtest('it renders loading if "isLoading" is true', async () => {
    await act(async () => {
      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <AutocompleteFieldListsComponent
            placeholder="Placeholder text"
            selectedField={getField('ip')}
            selectedValue="some-list-id"
            isLoading={true}
            isClearable={false}
            isDisabled={false}
            onChange={jest.fn()}
          />
        </ThemeProvider>
      );
      await wait();
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
  });

  test('it allows user to clear values if "isClearable" is true', async () => {
    await act(async () => {
      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <AutocompleteFieldListsComponent
            placeholder="Placeholder text"
            selectedField={getField('ip')}
            selectedValue="some-list-id"
            isLoading={false}
            isClearable={true}
            isDisabled={false}
            onChange={jest.fn()}
          />
        </ThemeProvider>
      );
      await wait();
      expect(
        wrapper
          .find(`[data-test-subj="comboBoxInput"]`)
          .hasClass('euiComboBox__inputWrap-isClearable')
      ).toBeTruthy();
    });
  });

  test('it correctly displays lists that match the selected "keyword" field esType', async () => {
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

    await act(async () => {
      wrapper.find('[data-test-subj="comboBoxToggleListButton"] button').simulate('click');
    });

    expect(
      wrapper.find('[data-test-subj="valuesAutocompleteComboBox listsComboxBox"]').at(0).props()
        .options
    ).toEqual([{ label: 'keyword list' }]);
  });

  test('it correctly displays lists that match the selected "ip" field esType', async () => {
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

    await act(async () => {
      wrapper.find('[data-test-subj="comboBoxToggleListButton"] button').simulate('click');
    });

    expect(
      wrapper.find('[data-test-subj="valuesAutocompleteComboBox listsComboxBox"]').at(0).props()
        .options
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

    await act(async () => {
      ((wrapper.find(EuiComboBox).props() as unknown) as {
        onChange: (a: EuiComboBoxOptionOption[]) => void;
      }).onChange([{ label: 'some name' }]);
    });

    expect(mockOnChange).toHaveBeenCalledWith({
      created_at: '2020-04-20T15:25:31.830Z',
      created_by: 'some user',
      description: 'some description',
      id: 'some-list-id',
      meta: {},
      name: 'some name',
      tie_breaker_id: '6a76b69d-80df-4ab2-8c3e-85f466b06a0e',
      type: 'ip',
      updated_at: '2020-04-20T15:25:31.830Z',
      updated_by: 'some user',
    });
  });
});
