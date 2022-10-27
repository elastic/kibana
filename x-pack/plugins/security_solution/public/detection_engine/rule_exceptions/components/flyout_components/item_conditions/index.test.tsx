/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { ExceptionsConditions } from '.';
import { TestProviders, mockIndexPattern } from '../../../../../common/mock';
import { getRulesEqlSchemaMock } from '../../../../../../common/detection_engine/rule_schema/mocks';
import type { Rule } from '../../../../rule_management/logic/types';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import * as i18n from './translations';

jest.mock('@kbn/lists-plugin/public');

describe('ExceptionsConditions', () => {
  describe('EQL rule type', () => {
    it('it displays EQL warning callout if rule is EQL sequence', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionsConditions
            exceptionItemName={'Item name'}
            allowLargeValueLists={false}
            exceptionListItems={[]}
            indexPatterns={mockIndexPattern}
            rules={[
              {
                ...getRulesEqlSchemaMock(),
                query: 'sequence [process where process.name = "test.exe"]',
              } as Rule,
            ]}
            showOsTypeOptions={false}
            isEdit={false}
            selectedOs={undefined}
            exceptionListType={ExceptionListTypeEnum.DETECTION}
            onOsChange={jest.fn()}
            onExceptionItemAdd={jest.fn()}
            onSetErrorExists={jest.fn()}
            onFilterIndexPatterns={jest.fn()}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="eqlSequenceCallout"]').at(0).text()).toEqual(
        i18n.ADD_EXCEPTION_SEQUENCE_WARNING
      );
    });

    it('it displays EQL editing warning callout if rule is EQL sequence and "isEdit" is "true"', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionsConditions
            exceptionItemName={'Item name'}
            allowLargeValueLists={false}
            exceptionListItems={[getExceptionListItemSchemaMock()]}
            indexPatterns={mockIndexPattern}
            rules={[
              {
                ...getRulesEqlSchemaMock(),
                query: 'sequence [process where process.name = "test.exe"]',
              } as Rule,
            ]}
            showOsTypeOptions={false}
            isEdit
            selectedOs={undefined}
            exceptionListType={ExceptionListTypeEnum.RULE_DEFAULT}
            onOsChange={jest.fn()}
            onExceptionItemAdd={jest.fn()}
            onSetErrorExists={jest.fn()}
            onFilterIndexPatterns={jest.fn()}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="eqlSequenceCallout"]').at(0).text()).toEqual(
        i18n.EDIT_EXCEPTION_SEQUENCE_WARNING
      );
    });

    it('it does not display EQL warning callout if rule is EQL sequence', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionsConditions
            exceptionItemName={'Item name'}
            allowLargeValueLists={false}
            exceptionListItems={[]}
            indexPatterns={mockIndexPattern}
            rules={[
              {
                ...getRulesEqlSchemaMock(),
              } as Rule,
            ]}
            showOsTypeOptions={false}
            isEdit={false}
            selectedOs={undefined}
            exceptionListType={ExceptionListTypeEnum.DETECTION}
            onOsChange={jest.fn()}
            onExceptionItemAdd={jest.fn()}
            onSetErrorExists={jest.fn()}
            onFilterIndexPatterns={jest.fn()}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="eqlSequenceCallout"]').exists()).toBeFalsy();
    });
  });

  describe('OS options', () => {
    it('it displays os options if "showOsTypeOptions" is "true"', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionsConditions
            exceptionItemName={'Item name'}
            allowLargeValueLists={false}
            exceptionListItems={[]}
            indexPatterns={mockIndexPattern}
            rules={[
              {
                ...getRulesEqlSchemaMock(),
              } as Rule,
            ]}
            showOsTypeOptions
            isEdit={false}
            selectedOs={undefined}
            exceptionListType={ExceptionListTypeEnum.ENDPOINT}
            onOsChange={jest.fn()}
            onExceptionItemAdd={jest.fn()}
            onSetErrorExists={jest.fn()}
            onFilterIndexPatterns={jest.fn()}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="osSelectionDropdown"]').exists()).toBeTruthy();
    });

    it('it displays the exception item os text if "isEdit" is "true"', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionsConditions
            exceptionItemName={'Item name'}
            allowLargeValueLists={false}
            exceptionListItems={[
              {
                ...getExceptionListItemSchemaMock(),
                os_types: ['windows'],
              },
            ]}
            indexPatterns={mockIndexPattern}
            rules={[
              {
                ...getRulesEqlSchemaMock(),
              } as Rule,
            ]}
            showOsTypeOptions
            isEdit
            exceptionListType={ExceptionListTypeEnum.ENDPOINT}
            selectedOs={undefined}
            onOsChange={jest.fn()}
            onExceptionItemAdd={jest.fn()}
            onSetErrorExists={jest.fn()}
            onFilterIndexPatterns={jest.fn()}
          />
        </TestProviders>
      );

      // Text appears funky since not applying styling
      expect(wrapper.find('[data-test-subj="exceptionItemSelectedOs"]').at(0).text()).toEqual(
        'Operating SystemWindows'
      );
    });

    it('it does not display os options if "showOsTypeOptions" is "false"', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionsConditions
            exceptionItemName={'Item name'}
            allowLargeValueLists={false}
            exceptionListItems={[]}
            indexPatterns={mockIndexPattern}
            rules={[
              {
                ...getRulesEqlSchemaMock(),
              } as Rule,
            ]}
            showOsTypeOptions={false}
            isEdit={false}
            selectedOs={undefined}
            exceptionListType={ExceptionListTypeEnum.ENDPOINT}
            onOsChange={jest.fn()}
            onExceptionItemAdd={jest.fn()}
            onSetErrorExists={jest.fn()}
            onFilterIndexPatterns={jest.fn()}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="osSelectionDropdown"]').exists()).toBeFalsy();
    });
  });
});
