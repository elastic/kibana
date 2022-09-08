/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { ExceptionsAddToListsTable } from '.';
import { TestProviders } from '../../../../../common/mock';
import { useFindExceptionListReferences } from '../../../logic/use_find_references';
import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { act } from 'react-dom/test-utils';

jest.mock('../../../logic/use_find_references');
jest.mock('@kbn/securitysolution-list-api', () => {
  const actual = jest.requireActual('@kbn/securitysolution-list-api');
  return {
    ...actual,
    fetchExceptionLists: jest.fn().mockResolvedValue({
      data: [{ name: 'Mock list', id: '123', list_id: 'my_list_id' } as ExceptionListSchema],
    }),
  };
});

describe('ExceptionsAddToListsTable', () => {
  it('it displays loading state while fetching data', () => {
    (useFindExceptionListReferences as jest.Mock).mockReturnValue([true, null]);
    const wrapper = mountWithIntl(
      <TestProviders>
        <ExceptionsAddToListsTable sharedExceptionLists={[]} onListSelectionChange={jest.fn()} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionItemListsTableLoading"]').exists()).toBeTruthy();
  });

  // HELP: Can't get this one to work after state update removing loading state
  xit('it displays lists with rule references', async () => {
    const wrapper = mountWithIntl(
      <TestProviders>
        <ExceptionsAddToListsTable
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

    act(() => {
      (useFindExceptionListReferences as jest.Mock).mockReturnValue([
        false,
        {
          my_list_id: [
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
      ]);
    });

    expect(wrapper.find('td[data-test-subj="exceptionListNameCell"]')).toHaveLength(1);
    expect(wrapper.find('td[data-test-subj="exceptionListRulesLinkedToIdCell"]').text()).toEqual(
      '1'
    );
  });
});
