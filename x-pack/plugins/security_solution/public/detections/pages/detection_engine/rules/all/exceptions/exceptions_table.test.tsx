/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../../../../common/mock';
import { mockHistory } from '../../../../../../common/utils/route/index.test';
import { getExceptionListSchemaMock } from '../../../../../../../../lists/common/schemas/response/exception_list_schema.mock';

import { ExceptionListsTable } from './exceptions_table';
import { useKibana } from '../../../../../../common/lib/kibana';
import { useApi, useExceptionLists } from '../../../../../../shared_imports';
import { useAllExceptionLists } from './use_all_exception_lists';

jest.mock('../../../../../../common/lib/kibana');
jest.mock('./use_all_exception_lists');
jest.mock('../../../../../../shared_imports');

describe('ExceptionListsTable', () => {
  const exceptionList1 = getExceptionListSchemaMock();
  const exceptionList2 = { ...getExceptionListSchemaMock(), list_id: 'not_endpoint_list', id: '2' };

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: {},
        notifications: {
          toasts: {
            addError: jest.fn(),
          },
        },
      },
    });

    (useApi as jest.Mock).mockReturnValue({
      deleteExceptionList: jest.fn(),
      exportExceptionList: jest.fn(),
    });

    (useExceptionLists as jest.Mock).mockReturnValue([
      false,
      [exceptionList1, exceptionList2],
      {
        page: 1,
        perPage: 20,
        total: 2,
      },
      jest.fn(),
    ]);

    (useAllExceptionLists as jest.Mock).mockReturnValue([
      false,
      [
        { ...exceptionList1, rules: [] },
        { ...exceptionList2, rules: [] },
      ],
      {
        not_endpoint_list: exceptionList2,
        endpoint_list: exceptionList1,
      },
    ]);
  });

  it('renders delete option disabled if list is "endpoint_list"', async () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionListsTable
          history={mockHistory}
          hasNoPermissions={false}
          loading={false}
          formatUrl={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionsTableListId"]').at(0).text()).toEqual(
      'endpoint_list'
    );
    expect(
      wrapper.find('[data-test-subj="exceptionsTableDeleteButton"] button').at(0).prop('disabled')
    ).toBeTruthy();

    expect(wrapper.find('[data-test-subj="exceptionsTableListId"]').at(1).text()).toEqual(
      'not_endpoint_list'
    );
    expect(
      wrapper.find('[data-test-subj="exceptionsTableDeleteButton"] button').at(1).prop('disabled')
    ).toBeFalsy();
  });
});
