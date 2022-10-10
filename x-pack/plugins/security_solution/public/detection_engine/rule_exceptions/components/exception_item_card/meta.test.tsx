/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';

import { ExceptionItemCardMetaInfo } from './meta';
import { TestProviders } from '../../../../common/mock';

describe('ExceptionItemCardMetaInfo', () => {
  it('it renders item creation info', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionItemCardMetaInfo
          item={getExceptionListItemSchemaMock()}
          references={{
            ...getExceptionListSchemaMock(),
            referenced_rules: [
              {
                id: '1a2b3c',
                name: 'Simple Rule Query',
                rule_id: 'rule-2',
                exception_lists: [
                  {
                    id: '123',
                    list_id: 'i_exist',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                  {
                    id: '456',
                    list_id: 'i_exist_2',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                ],
              },
            ],
          }}
          dataTestSubj="exceptionItemMeta"
        />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionItemMeta-createdBy-value1"]').at(0).text()
    ).toEqual('Apr 20, 2020 @ 15:25:31.830');
    expect(
      wrapper.find('[data-test-subj="exceptionItemMeta-createdBy-value2"]').at(0).text()
    ).toEqual('some user');
  });

  it('it renders item update info', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionItemCardMetaInfo
          item={getExceptionListItemSchemaMock()}
          references={{
            ...getExceptionListSchemaMock(),
            referenced_rules: [
              {
                id: '1a2b3c',
                name: 'Simple Rule Query',
                rule_id: 'rule-2',
                exception_lists: [
                  {
                    id: '123',
                    list_id: 'i_exist',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                  {
                    id: '456',
                    list_id: 'i_exist_2',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                ],
              },
            ],
          }}
          dataTestSubj="exceptionItemMeta"
        />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionItemMeta-updatedBy-value1"]').at(0).text()
    ).toEqual('Apr 20, 2020 @ 15:25:31.830');
    expect(
      wrapper.find('[data-test-subj="exceptionItemMeta-updatedBy-value2"]').at(0).text()
    ).toEqual('some user');
  });

  it('it renders references info', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionItemCardMetaInfo
          item={getExceptionListItemSchemaMock()}
          references={{
            ...getExceptionListSchemaMock(),
            referenced_rules: [
              {
                id: '1a2b3c',
                name: 'Simple Rule Query',
                rule_id: 'rule-2',
                exception_lists: [
                  {
                    id: '123',
                    list_id: 'i_exist',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                  {
                    id: '456',
                    list_id: 'i_exist_2',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                ],
              },
            ],
          }}
          dataTestSubj="exceptionItemMeta"
        />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionItemMeta-affectedRulesButton"]').at(0).text()
    ).toEqual('Affects 1 rule');
  });

  it('it renders references info when multiple references exist', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionItemCardMetaInfo
          item={getExceptionListItemSchemaMock()}
          references={{
            ...getExceptionListSchemaMock(),
            referenced_rules: [
              {
                id: '1a2b3c',
                name: 'Simple Rule Query',
                rule_id: 'rule-2',
                exception_lists: [
                  {
                    id: '123',
                    list_id: 'i_exist',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                  {
                    id: '456',
                    list_id: 'i_exist_2',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                ],
              },
              {
                exception_lists: [
                  {
                    id: '123',
                    list_id: 'i_exist',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                  {
                    id: '456',
                    list_id: 'i_exist_2',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                ],
                id: 'aaa',
                name: 'Simple Rule Query 2',
                rule_id: 'rule-3',
              },
            ],
          }}
          dataTestSubj="exceptionItemMeta"
        />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionItemMeta-affectedRulesButton"]').at(0).text()
    ).toEqual('Affects 2 rules');
  });
});
