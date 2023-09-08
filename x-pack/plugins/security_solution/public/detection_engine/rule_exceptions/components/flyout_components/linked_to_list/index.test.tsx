/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ExceptionsLinkedToLists } from '.';
import { TestProviders } from '../../../../../common/mock';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { mount } from 'enzyme';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';

jest.mock('../../../logic/use_find_references');

// TODO change the test to RTl react testing library
describe('ExceptionsLinkedToLists', () => {
  it('it displays loading state while "isLoadingReferences" is "true"', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionsLinkedToLists
          isLoadingReferences={true}
          errorFetchingReferences={false}
          listAndReferences={[]}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionItemListsTableLoading"]').exists()).toBeTruthy();
  });

  it('it displays error state if "errorFetchingReferences" is "true"', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionsLinkedToLists
          isLoadingReferences={false}
          errorFetchingReferences
          listAndReferences={[]}
        />
      </TestProviders>
    );

    expect(wrapper.find('EuiInMemoryTable').prop('error')).toEqual(
      'Unable to fetch exception list.'
    );
  });

  it.skip('it displays lists with rule references', async () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionsLinkedToLists
          isLoadingReferences={false}
          errorFetchingReferences={false}
          listAndReferences={[
            {
              ...getExceptionListSchemaMock(),
              id: '123',
              list_id: 'my_list_id',
              namespace_type: 'single',
              type: ExceptionListTypeEnum.DETECTION,
              name: 'My exception list',
              referenced_rules: [
                {
                  id: '345',
                  name: 'My rule',
                  rule_id: 'my_rule_id',
                  exception_lists: [
                    {
                      id: '123',
                      list_id: 'my_list_id',
                      namespace_type: 'single',
                      type: ExceptionListTypeEnum.DETECTION,
                    },
                  ],
                },
              ],
            },
          ]}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="addToSharedListsLinkedRulesMenu"]').at(1).text()).toEqual(
      '1'
    );
    // Formatting is off since doesn't take css into account
    expect(
      wrapper.find('[data-test-subj="addToSharedListsLinkedRulesMenuAction"]').at(1).text()
    ).toEqual('NameMy exception list');
  });
});
