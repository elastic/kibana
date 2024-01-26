/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ExceptionsAddToListsTable } from '.';
import { TestProviders } from '../../../../../common/mock';
import { useFindExceptionListReferences } from '../../../logic/use_find_references';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { mount } from 'enzyme';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';

jest.mock('../../../logic/use_find_references');

// TODO need to change it to use React-testing-library
describe.skip('ExceptionsAddToListsTable', () => {
  const mockFn = jest.fn();

  beforeEach(() => {
    (useFindExceptionListReferences as jest.Mock).mockReturnValue([
      false,
      false,
      {
        my_list_id: {
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
      },
      mockFn,
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('it displays loading state while fetching data', () => {
    (useFindExceptionListReferences as jest.Mock).mockReturnValue([true, false, null, mockFn]);
    const wrapper = mount(
      <TestProviders>
        <ExceptionsAddToListsTable
          showAllSharedLists={false}
          sharedExceptionLists={[
            {
              id: '123',
              list_id: 'my_list_id',
              namespace_type: 'single',
              type: ExceptionListTypeEnum.DETECTION,
            },
          ]}
          onListSelectionChange={jest.fn()}
        />
      </TestProviders>
    );

    expect(mockFn).toHaveBeenCalledWith([
      {
        id: '123',
        listId: 'my_list_id',
        namespaceType: 'single',
      },
    ]);
    expect(wrapper.find('[data-test-subj="exceptionItemListsTableLoading"]').exists()).toBeTruthy();
  });

  it('it displays error state if fetching list and references data fails', () => {
    (useFindExceptionListReferences as jest.Mock).mockReturnValue([false, true, null, jest.fn()]);
    const wrapper = mount(
      <TestProviders>
        <ExceptionsAddToListsTable
          showAllSharedLists={false}
          sharedExceptionLists={[
            {
              id: '123',
              list_id: 'my_list_id',
              namespace_type: 'single',
              type: ExceptionListTypeEnum.DETECTION,
            },
          ]}
          onListSelectionChange={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('EuiInMemoryTable').prop('error')).toEqual(
      'Unable to load shared exception lists'
    );
  });

  it('it invokes "useFindExceptionListReferences" with array of namespace types to fetch all lists if "showAllSharedLists" is "true"', () => {
    mount(
      <TestProviders>
        <ExceptionsAddToListsTable
          showAllSharedLists
          sharedExceptionLists={[
            {
              id: '123',
              list_id: 'my_list_id',
              namespace_type: 'single',
              type: ExceptionListTypeEnum.DETECTION,
            },
          ]}
          onListSelectionChange={jest.fn()}
        />
      </TestProviders>
    );

    expect(mockFn).toHaveBeenCalledWith([
      { namespaceType: 'single' },
      { namespaceType: 'agnostic' },
    ]);
  });

  it('it displays lists with rule references', async () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionsAddToListsTable
          showAllSharedLists={false}
          sharedExceptionLists={[
            {
              id: '123',
              list_id: 'my_list_id',
              namespace_type: 'single',
              type: ExceptionListTypeEnum.DETECTION,
            },
          ]}
          onListSelectionChange={jest.fn()}
        />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="ruleReferencesDisplayPopoverButton"]').at(1).text()
    ).toEqual('1');
    // Formatting is off since doesn't take css into account
    expect(wrapper.find('[data-test-subj="exceptionListNameCell"]').at(1).text()).toEqual(
      'NameMy exception list'
    );
  });
});
