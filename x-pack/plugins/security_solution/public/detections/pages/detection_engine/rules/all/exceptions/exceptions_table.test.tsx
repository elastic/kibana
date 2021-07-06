/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../../../../common/mock';
import { mockHistory } from '../../../../../../common/utils/route/index.test';
import { getExceptionListSchemaMock } from '../../../../../../../../lists/common/schemas/response/exception_list_schema.mock';

import { ExceptionListsTable } from './exceptions_table';
import { useApi, useExceptionLists } from '@kbn/securitysolution-list-hooks';
import { useAllExceptionLists } from './use_all_exception_lists';
import { useHistory } from 'react-router-dom';

jest.mock('../../../../../../common/lib/kibana');
jest.mock('./use_all_exception_lists');
jest.mock('@kbn/securitysolution-list-hooks');
jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  return {
    ...originalModule,
    useHistory: jest.fn(),
  };
});
jest.mock('@kbn/i18n/react', () => {
  const originalModule = jest.requireActual('@kbn/i18n/react');
  const FormattedRelative = jest.fn().mockImplementation(() => '20 hours ago');

  return {
    ...originalModule,
    FormattedRelative,
  };
});

jest.mock('../../../../../containers/detection_engine/lists/use_lists_config', () => ({
  useListsConfig: jest.fn().mockReturnValue({ loading: false }),
}));

jest.mock('../../../../../components/user_info', () => ({
  useUserData: jest.fn().mockReturnValue([
    {
      loading: false,
      canUserCRUD: false,
    },
  ]),
}));

describe('ExceptionListsTable', () => {
  const exceptionList1 = getExceptionListSchemaMock();
  const exceptionList2 = { ...getExceptionListSchemaMock(), list_id: 'not_endpoint_list', id: '2' };

  beforeAll(() => {
    (useHistory as jest.Mock).mockReturnValue(mockHistory);
  });

  beforeEach(() => {
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
        <ExceptionListsTable />
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
