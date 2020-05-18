/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import * as i18n from './translations';
import { EntryItem } from './entry_item';
import { mockBrowserFields } from '../common/containers/source/mock';
import { Operator } from './types';
import {
  isOperator,
  isNotOperator,
  isOneOfOperator,
  isNotOneOfOperator,
  isInListOperator,
  isNotInListOperator,
  existsOperator,
  doesNotExistOperator,
} from './operators';

describe('EntryItem', () => {
  describe('field', () => {
    test('it renders expected placedholder if field is empty', () => {
      const wrapper = mount(
        <EntryItem
          idAria="someAriaId"
          listType="siem"
          exceptionItemEntry={{
            field: '',
            operator: 'included',
            match: '',
          }}
          exceptionItemIndex={0}
          entryIndex={0}
          onEntryUpdate={jest.fn()}
          isLastEntry={false}
          indexPatternLoading={false}
          onDeleteEntry={jest.fn()}
          browserFields={mockBrowserFields}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="exceptionsFieldSuggestionInput"]')
          .first()
          .props().placeholder
      ).toEqual(i18n.EXCEPTION_FIELD_PLACEHOLDER);
      expect(
        wrapper.find('[data-test-subj="exceptionsFieldSuggestionInput"].euiComboBox-isInvalid')
      ).toHaveLength(0);
    });

    test('it renders "field" value if "field" exists', () => {
      const wrapper = mount(
        <EntryItem
          idAria="someAriaId"
          listType="siem"
          exceptionItemEntry={{
            field: 'agent.hostname',
            operator: 'included',
            match: 'rock01',
          }}
          exceptionItemIndex={0}
          entryIndex={0}
          onEntryUpdate={jest.fn()}
          isLastEntry={false}
          indexPatternLoading={false}
          onDeleteEntry={jest.fn()}
          browserFields={mockBrowserFields}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="exceptionsFieldSuggestionInput"] EuiComboBoxInput')
          .first()
          .props().value
      ).toEqual('agent.hostname');
      expect(
        wrapper.find('[data-test-subj="exceptionsFieldSuggestionInput"].euiComboBox-isInvalid')
      ).toHaveLength(0);
    });
  });

  describe('operator', () => {
    test('it renders "operator" of "is" when operator is "included" and operator type is "match"', () => {
      const wrapper = mount(
        <EntryItem
          idAria="someAriaId"
          listType="siem"
          exceptionItemEntry={{ field: '', operator: 'included', match: '' }}
          exceptionItemIndex={0}
          entryIndex={0}
          onEntryUpdate={jest.fn()}
          isLastEntry={false}
          indexPatternLoading={false}
          onDeleteEntry={jest.fn()}
          browserFields={mockBrowserFields}
        />
      );

      expect(
        wrapper
          .find('select[data-test-subj="exceptionBuilderOperatorSelect"]')
          .first()
          .props().value
      ).toEqual(isOperator.value);
    });

    test('it renders "operator" of "is_not" when operator is "excluded" and operator type is "match"', () => {
      const wrapper = mount(
        <EntryItem
          idAria="someAriaId"
          listType="siem"
          exceptionItemEntry={{ field: '', operator: Operator.EXCLUSION, match: '' }}
          exceptionItemIndex={0}
          entryIndex={0}
          onEntryUpdate={jest.fn()}
          isLastEntry={false}
          indexPatternLoading={false}
          onDeleteEntry={jest.fn()}
          browserFields={mockBrowserFields}
        />
      );

      expect(
        wrapper
          .find('select[data-test-subj="exceptionBuilderOperatorSelect"]')
          .first()
          .props().value
      ).toEqual(isNotOperator.value);
    });

    test('it renders "operator" of "is_one_of" when operator is "included" and operator type is "match_any"', () => {
      const wrapper = mount(
        <EntryItem
          idAria="someAriaId"
          listType="siem"
          exceptionItemEntry={{ field: '', operator: 'included', match_any: [] }}
          exceptionItemIndex={0}
          entryIndex={0}
          onEntryUpdate={jest.fn()}
          isLastEntry={false}
          indexPatternLoading={false}
          onDeleteEntry={jest.fn()}
          browserFields={mockBrowserFields}
        />
      );

      expect(
        wrapper
          .find('select[data-test-subj="exceptionBuilderOperatorSelect"]')
          .first()
          .props().value
      ).toEqual(isOneOfOperator.value);
    });

    test('it renders "operator" of "is_not_one_of" when operator is "excluded" and operator type is "match_any"', () => {
      const wrapper = mount(
        <EntryItem
          idAria="someAriaId"
          listType="siem"
          exceptionItemEntry={{ field: '', operator: Operator.EXCLUSION, match_any: [] }}
          exceptionItemIndex={0}
          entryIndex={0}
          onEntryUpdate={jest.fn()}
          isLastEntry={false}
          indexPatternLoading={false}
          onDeleteEntry={jest.fn()}
          browserFields={mockBrowserFields}
        />
      );

      expect(
        wrapper
          .find('select[data-test-subj="exceptionBuilderOperatorSelect"]')
          .first()
          .props().value
      ).toEqual(isNotOneOfOperator.value);
    });

    test('it renders "operator" of "exists" when operator is "included" and operator type is "exists"', () => {
      const wrapper = mount(
        <EntryItem
          idAria="someAriaId"
          listType="siem"
          exceptionItemEntry={{ field: '', operator: 'included' }}
          exceptionItemIndex={0}
          entryIndex={0}
          onEntryUpdate={jest.fn()}
          isLastEntry={false}
          indexPatternLoading={false}
          onDeleteEntry={jest.fn()}
          browserFields={mockBrowserFields}
        />
      );

      expect(
        wrapper
          .find('select[data-test-subj="exceptionBuilderOperatorSelect"]')
          .first()
          .props().value
      ).toEqual(existsOperator.value);
    });

    test('it renders "operator" of "does_not_exist" when operator is "excluded" and operator type is "exists"', () => {
      const wrapper = mount(
        <EntryItem
          idAria="someAriaId"
          listType="siem"
          exceptionItemEntry={{ field: '', operator: Operator.EXCLUSION }}
          exceptionItemIndex={0}
          entryIndex={0}
          onEntryUpdate={jest.fn()}
          isLastEntry={false}
          indexPatternLoading={false}
          onDeleteEntry={jest.fn()}
          browserFields={mockBrowserFields}
        />
      );

      expect(
        wrapper
          .find('select[data-test-subj="exceptionBuilderOperatorSelect"]')
          .first()
          .props().value
      ).toEqual(doesNotExistOperator.value);
    });

    test('it renders "operator" of "is in list" when operator is "included" and operator type is "list"', () => {
      const wrapper = mount(
        <EntryItem
          idAria="someAriaId"
          listType="siem"
          exceptionItemEntry={{ field: '', operator: 'included', list: '' }}
          exceptionItemIndex={0}
          entryIndex={0}
          onEntryUpdate={jest.fn()}
          isLastEntry={false}
          indexPatternLoading={false}
          onDeleteEntry={jest.fn()}
          browserFields={mockBrowserFields}
        />
      );

      expect(
        wrapper
          .find('select[data-test-subj="exceptionBuilderOperatorSelect"]')
          .first()
          .props().value
      ).toEqual(isInListOperator.value);
    });

    test('it renders "operator" of "is_not_in_list" when operator is "excluded" and operator type is "list"', () => {
      const wrapper = mount(
        <EntryItem
          idAria="someAriaId"
          listType="siem"
          exceptionItemEntry={{ field: '', operator: Operator.EXCLUSION, list: '' }}
          exceptionItemIndex={0}
          entryIndex={0}
          onEntryUpdate={jest.fn()}
          isLastEntry={false}
          indexPatternLoading={false}
          onDeleteEntry={jest.fn()}
          browserFields={mockBrowserFields}
        />
      );

      expect(
        wrapper
          .find('select[data-test-subj="exceptionBuilderOperatorSelect"]')
          .first()
          .props().value
      ).toEqual(isNotInListOperator.value);
    });
  });

  describe('field value', () => {
    test('it renders expected placedholder if operator type is "match" and field value is empty', () => {
      const wrapper = mount(
        <EntryItem
          idAria="someAriaId"
          listType="siem"
          exceptionItemEntry={{
            field: '',
            operator: 'included',
            match: '',
          }}
          exceptionItemIndex={0}
          entryIndex={0}
          onEntryUpdate={jest.fn()}
          isLastEntry={false}
          indexPatternLoading={false}
          onDeleteEntry={jest.fn()}
          browserFields={mockBrowserFields}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="exceptionBuilderMatchComboBox"] EuiComboBoxInput')
          .first()
          .props().placeholder
      ).toEqual(i18n.EXCEPTION_FIELD_VALUE_PLACEHOLDER);
      expect(
        wrapper.find('[data-test-subj="exceptionBuilderMatchComboBox"].euiComboBox-isInvalid')
      ).toHaveLength(0);
    });

    test('it renders field value if "match" value exists', () => {
      const wrapper = mount(
        <EntryItem
          idAria="someAriaId"
          listType="siem"
          exceptionItemEntry={{
            field: 'host.name',
            operator: 'included',
            match: 'jibber',
          }}
          exceptionItemIndex={0}
          entryIndex={0}
          onEntryUpdate={jest.fn()}
          isLastEntry={false}
          indexPatternLoading={false}
          onDeleteEntry={jest.fn()}
          browserFields={mockBrowserFields}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="exceptionBuilderMatchComboBox"] EuiComboBoxInput')
          .first()
          .props().value
      ).toEqual('jibber');
      expect(
        wrapper.find('[data-test-subj="exceptionBuilderMatchComboBox"].euiComboBox-isInvalid')
      ).toHaveLength(0);
    });

    test('it renders expected placedholder if operator type is "match_any" and field value is empty', () => {
      const wrapper = mount(
        <EntryItem
          idAria="someAriaId"
          listType="siem"
          exceptionItemEntry={{ field: '', operator: 'included', match_any: [] }}
          exceptionItemIndex={0}
          entryIndex={0}
          onEntryUpdate={jest.fn()}
          isLastEntry={false}
          indexPatternLoading={false}
          onDeleteEntry={jest.fn()}
          browserFields={mockBrowserFields}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="exceptionBuilderMatchAnyComboBox"] EuiComboBoxInput')
          .first()
          .props().placeholder
      ).toEqual(i18n.EXCEPTION_FIELD_VALUE_PLACEHOLDER);
      expect(
        wrapper.find('[data-test-subj="exceptionBuilderMatchAnyComboBox"].euiComboBox-isInvalid')
      ).toHaveLength(0);
    });

    test('it renders field value if "match_any" value exists', () => {
      const wrapper = mount(
        <EntryItem
          idAria="someAriaId"
          listType="siem"
          exceptionItemEntry={{
            field: 'host.name',
            operator: 'included',
            match_any: ['jibber', 'jabber'],
          }}
          exceptionItemIndex={0}
          entryIndex={0}
          onEntryUpdate={jest.fn()}
          isLastEntry={false}
          indexPatternLoading={false}
          onDeleteEntry={jest.fn()}
          browserFields={mockBrowserFields}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="exceptionBuilderMatchAnyComboBox"] EuiComboBoxInput')
          .first()
          .props().value
      ).toEqual('jibber, jabber');
      expect(
        wrapper.find('[data-test-subj="exceptionBuilderMatchAnyComboBox"].euiComboBox-isInvalid')
      ).toHaveLength(0);
    });

    test('it renders expected placedholder if operator type is "list" and field value is empty', () => {
      const wrapper = mount(
        <EntryItem
          idAria="someAriaId"
          listType="siem"
          exceptionItemEntry={{ field: '', operator: 'included', list: '' }}
          exceptionItemIndex={0}
          entryIndex={0}
          onEntryUpdate={jest.fn()}
          isLastEntry={false}
          indexPatternLoading={false}
          onDeleteEntry={jest.fn()}
          browserFields={mockBrowserFields}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="exceptionBuilderListComboBox"] EuiComboBoxInput')
          .first()
          .props().placeholder
      ).toEqual(i18n.EXCEPTION_LIST_VALUE_PLACEHOLDER);
      expect(
        wrapper.find('[data-test-subj="exceptionBuilderListComboBox"].euiComboBox-isInvalid')
      ).toHaveLength(0);
    });

    test('it renders field value if "list" value exists', () => {
      const wrapper = mount(
        <EntryItem
          idAria="someAriaId"
          listType="siem"
          exceptionItemEntry={{ field: 'host.name', operator: 'included', list: '123' }}
          exceptionItemIndex={0}
          entryIndex={0}
          onEntryUpdate={jest.fn()}
          isLastEntry={false}
          indexPatternLoading={false}
          onDeleteEntry={jest.fn()}
          browserFields={mockBrowserFields}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="exceptionBuilderListComboBox"] EuiComboBoxInput')
          .first()
          .props().value
      ).toEqual('123');
      expect(
        wrapper.find('[data-test-subj="exceptionBuilderListComboBox"].euiComboBox-isInvalid')
      ).toHaveLength(0);
    });

    test('it renders input disabled if operator type is "exists"', () => {
      const wrapper = mount(
        <EntryItem
          idAria="someAriaId"
          listType="siem"
          exceptionItemEntry={{ field: '', operator: 'included' }}
          exceptionItemIndex={0}
          entryIndex={0}
          onEntryUpdate={jest.fn()}
          isLastEntry={false}
          indexPatternLoading={false}
          onDeleteEntry={jest.fn()}
          browserFields={mockBrowserFields}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="exceptionBuilderExistsComboBox"] EuiComboBoxInput')
          .first()
          .prop('isDisabled')
      ).toBeTruthy();
      expect(
        wrapper.find('[data-test-subj="exceptionBuilderExistsComboBox"].euiComboBox-isInvalid')
      ).toHaveLength(0);
    });
  });
});
