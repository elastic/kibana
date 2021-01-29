/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { ReactWrapper, mount } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { waitFor } from '@testing-library/react';

import {
  fields,
  getField,
} from '../../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks';
import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getEntryMatchAnyMock } from '../../../../../../lists/common/schemas/types/entry_match_any.mock';

import { useKibana } from '../../../../common/lib/kibana';
import { getEmptyValue } from '../../empty_value';

import { ExceptionBuilderComponent } from './';

jest.mock('../../../../common/lib/kibana');

describe('ExceptionBuilderComponent', () => {
  let wrapper: ReactWrapper;

  const getValueSuggestionsMock = jest.fn().mockResolvedValue(['value 1', 'value 2']);

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          autocomplete: {
            getValueSuggestions: getValueSuggestionsMock,
          },
        },
      },
    });
  });

  afterEach(() => {
    getValueSuggestionsMock.mockClear();
    jest.clearAllMocks();
    wrapper.unmount();
  });

  test('it displays empty entry if no "exceptionListItems" are passed in', () => {
    wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionBuilderComponent
          exceptionListItems={[]}
          listType="detection"
          listId="list_id"
          listNamespaceType="single"
          ruleName="Test rule"
          indexPatterns={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          isOrDisabled={false}
          isAndDisabled={false}
          isNestedDisabled={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiFlexGroup[data-test-subj="exceptionItemEntryContainer"]')).toHaveLength(
      1
    );
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').at(0).text()).toEqual(
      'Search'
    );
    expect(wrapper.find('[data-test-subj="operatorAutocompleteComboBox"]').at(0).text()).toEqual(
      'is'
    );
    expect(wrapper.find('[data-test-subj="valuesAutocompleteMatch"]').at(0).text()).toEqual(
      'Please select a field first...'
    );
  });

  test('it displays "exceptionListItems" that are passed in', async () => {
    wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionBuilderComponent
          exceptionListItems={[
            {
              ...getExceptionListItemSchemaMock(),
              entries: [
                { ...getEntryMatchAnyMock(), field: getField('ip').name, value: ['some ip'] },
              ],
            },
          ]}
          listType="detection"
          listId="list_id"
          listNamespaceType="single"
          ruleName="Test rule"
          indexPatterns={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          isOrDisabled={false}
          isAndDisabled={false}
          isNestedDisabled={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );
    expect(wrapper.find('EuiFlexGroup[data-test-subj="exceptionItemEntryContainer"]')).toHaveLength(
      1
    );
    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').at(0).text()).toEqual(
      'ip'
    );
    expect(wrapper.find('[data-test-subj="operatorAutocompleteComboBox"]').at(0).text()).toEqual(
      'is one of'
    );
    expect(wrapper.find('[data-test-subj="valuesAutocompleteMatchAny"]').at(0).text()).toEqual(
      'some ip'
    );
  });

  test('it displays "or", "and" and "add nested button" enabled', () => {
    wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionBuilderComponent
          exceptionListItems={[]}
          listType="detection"
          listId="list_id"
          listNamespaceType="single"
          ruleName="Test rule"
          indexPatterns={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          isOrDisabled={false}
          isAndDisabled={false}
          isNestedDisabled={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionsAndButton"] button').prop('disabled')
    ).toBeFalsy();
    expect(
      wrapper.find('[data-test-subj="exceptionsOrButton"] button').prop('disabled')
    ).toBeFalsy();
    expect(
      wrapper.find('[data-test-subj="exceptionsNestedButton"] button').prop('disabled')
    ).toBeFalsy();
  });

  test('it adds an entry when "and" clicked', async () => {
    wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionBuilderComponent
          exceptionListItems={[]}
          listType="detection"
          listId="list_id"
          listNamespaceType="single"
          ruleName="Test rule"
          indexPatterns={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          isOrDisabled={false}
          isAndDisabled={false}
          isNestedDisabled={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiFlexGroup[data-test-subj="exceptionItemEntryContainer"]')).toHaveLength(
      1
    );

    wrapper.find('[data-test-subj="exceptionsAndButton"] button').simulate('click');

    await waitFor(() => {
      expect(
        wrapper.find('EuiFlexGroup[data-test-subj="exceptionItemEntryContainer"]')
      ).toHaveLength(2);
      expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').at(0).text()).toEqual(
        'Search'
      );
      expect(wrapper.find('[data-test-subj="operatorAutocompleteComboBox"]').at(0).text()).toEqual(
        'is'
      );
      expect(wrapper.find('[data-test-subj="valuesAutocompleteMatch"]').at(0).text()).toEqual(
        'Please select a field first...'
      );

      expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').at(1).text()).toEqual(
        'Search'
      );
      expect(wrapper.find('[data-test-subj="operatorAutocompleteComboBox"]').at(1).text()).toEqual(
        'is'
      );
      expect(wrapper.find('[data-test-subj="valuesAutocompleteMatch"]').at(1).text()).toEqual(
        'Please select a field first...'
      );
    });
  });

  test('it adds an exception item when "or" clicked', async () => {
    wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionBuilderComponent
          exceptionListItems={[]}
          listType="detection"
          listId="list_id"
          listNamespaceType="single"
          ruleName="Test rule"
          indexPatterns={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          isOrDisabled={false}
          isAndDisabled={false}
          isNestedDisabled={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiFlexGroup[data-test-subj="exceptionEntriesContainer"]')).toHaveLength(
      1
    );

    wrapper.find('[data-test-subj="exceptionsOrButton"] button').simulate('click');

    await waitFor(() => {
      expect(wrapper.find('EuiFlexGroup[data-test-subj="exceptionEntriesContainer"]')).toHaveLength(
        2
      );

      const item1 = wrapper.find('EuiFlexGroup[data-test-subj="exceptionEntriesContainer"]').at(0);
      const item2 = wrapper.find('EuiFlexGroup[data-test-subj="exceptionEntriesContainer"]').at(1);

      expect(item1.find('[data-test-subj="exceptionBuilderEntryField"]').at(0).text()).toEqual(
        'Search'
      );
      expect(item1.find('[data-test-subj="operatorAutocompleteComboBox"]').at(0).text()).toEqual(
        'is'
      );
      expect(item1.find('[data-test-subj="valuesAutocompleteMatch"]').at(0).text()).toEqual(
        'Please select a field first...'
      );

      expect(item2.find('[data-test-subj="exceptionBuilderEntryField"]').at(0).text()).toEqual(
        'Search'
      );
      expect(item2.find('[data-test-subj="operatorAutocompleteComboBox"]').at(0).text()).toEqual(
        'is'
      );
      expect(item2.find('[data-test-subj="valuesAutocompleteMatch"]').at(0).text()).toEqual(
        'Please select a field first...'
      );
    });
  });

  test('it displays empty entry if user deletes last remaining entry', () => {
    wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionBuilderComponent
          exceptionListItems={[
            {
              ...getExceptionListItemSchemaMock(),
              entries: [
                { ...getEntryMatchAnyMock(), field: getField('ip').name, value: ['some ip'] },
              ],
            },
          ]}
          listType="detection"
          listId="list_id"
          listNamespaceType="single"
          ruleName="Test rule"
          indexPatterns={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          isOrDisabled={false}
          isAndDisabled={false}
          isNestedDisabled={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').at(0).text()).toEqual(
      'ip'
    );
    expect(wrapper.find('[data-test-subj="operatorAutocompleteComboBox"]').at(0).text()).toEqual(
      'is one of'
    );
    expect(wrapper.find('[data-test-subj="valuesAutocompleteMatchAny"]').at(0).text()).toEqual(
      'some ip'
    );

    wrapper.find('[data-test-subj="firstRowBuilderDeleteButton"] button').simulate('click');

    expect(wrapper.find('[data-test-subj="exceptionBuilderEntryField"]').at(0).text()).toEqual(
      'Search'
    );
    expect(wrapper.find('[data-test-subj="operatorAutocompleteComboBox"]').at(0).text()).toEqual(
      'is'
    );
    expect(wrapper.find('[data-test-subj="valuesAutocompleteMatch"]').at(0).text()).toEqual(
      'Please select a field first...'
    );
  });

  test('it displays "and" badge if at least one exception item includes more than one entry', () => {
    wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionBuilderComponent
          exceptionListItems={[]}
          listType="detection"
          listId="list_id"
          listNamespaceType="single"
          ruleName="Test rule"
          indexPatterns={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          isOrDisabled={false}
          isAndDisabled={false}
          isNestedDisabled={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionItemEntryFirstRowAndBadge"]').exists()
    ).toBeFalsy();

    wrapper.find('[data-test-subj="exceptionsAndButton"] button').simulate('click');

    expect(
      wrapper.find('[data-test-subj="exceptionItemEntryFirstRowAndBadge"]').exists()
    ).toBeTruthy();
  });

  test('it does not display "and" badge if none of the exception items include more than one entry', () => {
    wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionBuilderComponent
          exceptionListItems={[]}
          listType="detection"
          listId="list_id"
          listNamespaceType="single"
          ruleName="Test rule"
          indexPatterns={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          isOrDisabled={false}
          isAndDisabled={false}
          isNestedDisabled={false}
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="exceptionsOrButton"] button').simulate('click');

    expect(
      wrapper.find('[data-test-subj="exceptionItemEntryFirstRowAndBadge"]').exists()
    ).toBeFalsy();

    wrapper.find('[data-test-subj="exceptionsOrButton"] button').simulate('click');

    expect(
      wrapper.find('[data-test-subj="exceptionItemEntryFirstRowAndBadge"]').exists()
    ).toBeFalsy();
  });

  describe('nested entry', () => {
    test('it adds a nested entry when "add nested entry" clicked', async () => {
      wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <ExceptionBuilderComponent
            exceptionListItems={[]}
            listType="detection"
            listId="list_id"
            listNamespaceType="single"
            ruleName="Test rule"
            indexPatterns={{
              id: '1234',
              title: 'logstash-*',
              fields,
            }}
            isOrDisabled={false}
            isAndDisabled={false}
            isNestedDisabled={false}
            onChange={jest.fn()}
          />
        </ThemeProvider>
      );

      wrapper.find('[data-test-subj="exceptionsNestedButton"] button').simulate('click');

      await waitFor(() => {
        const entry2 = wrapper
          .find('EuiFlexGroup[data-test-subj="exceptionItemEntryContainer"]')
          .at(1);
        expect(entry2.find('[data-test-subj="exceptionBuilderEntryField"]').at(0).text()).toEqual(
          'Search nested field'
        );
        expect(entry2.find('[data-test-subj="operatorAutocompleteComboBox"]').at(0).text()).toEqual(
          'is'
        );
        expect(
          entry2.find('[data-test-subj="exceptionBuilderEntryFieldExists"]').at(0).text()
        ).toEqual(getEmptyValue());
      });
    });
  });
});
