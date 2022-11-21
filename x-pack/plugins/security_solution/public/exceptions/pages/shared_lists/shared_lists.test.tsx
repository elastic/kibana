/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TestProviders } from '../../../common/mock';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import { useUserData } from '../../../detections/components/user_info';

import { SharedLists } from '.';
import { useApi, useExceptionLists } from '@kbn/securitysolution-list-hooks';
import { useAllExceptionLists } from '../../hooks/use_all_exception_lists';
import { useHistory } from 'react-router-dom';
import { generateHistoryMock } from '../../../common/utils/route/mocks';
import { fireEvent, render, waitFor } from '@testing-library/react';

jest.mock('../../../detections/components/user_info');
jest.mock('../../../common/utils/route/mocks');
jest.mock('../../hooks/use_all_exception_lists');
jest.mock('@kbn/securitysolution-list-hooks');
jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  return {
    ...originalModule,
    useHistory: jest.fn(),
  };
});
jest.mock('@kbn/i18n-react', () => {
  const originalModule = jest.requireActual('@kbn/i18n-react');
  const FormattedRelative = jest.fn().mockImplementation(() => '20 hours ago');

  return {
    ...originalModule,
    FormattedRelative,
  };
});

jest.mock('../../../detections/containers/detection_engine/lists/use_lists_config', () => ({
  useListsConfig: jest.fn().mockReturnValue({ loading: false }),
}));

describe('SharedLists', () => {
  const mockHistory = generateHistoryMock();
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

    (useUserData as jest.Mock).mockReturnValue([
      {
        loading: false,
        canUserCRUD: false,
        canUserREAD: false,
      },
    ]);
  });

  it('renders delete option as disabled if list is "endpoint_list"', async () => {
    const wrapper = render(
      <TestProviders>
        <SharedLists />
      </TestProviders>
    );
    const allMenuActions = wrapper.getAllByTestId('sharedListOverflowCardButtonIcon');
    fireEvent.click(allMenuActions[0]);

    await waitFor(() => {
      const allDeleteActions = wrapper.getAllByTestId('sharedListOverflowCardActionItemDelete');
      expect(allDeleteActions[0]).toBeDisabled();
    });
  });

  it('renders delete option as disabled if user is read only', async () => {
    (useUserData as jest.Mock).mockReturnValue([
      {
        loading: false,
        canUserCRUD: false,
        canUserREAD: true,
      },
    ]);

    const wrapper = render(
      <TestProviders>
        <SharedLists />
      </TestProviders>
    );
    const allMenuActions = wrapper.getAllByTestId('sharedListOverflowCardButtonIcon');
    fireEvent.click(allMenuActions[1]);

    await waitFor(() => {
      const allDeleteActions = wrapper.queryAllByTestId('sharedListOverflowCardActionItemDelete');
      expect(allDeleteActions).toEqual([]);
      const allExportActions = wrapper.queryAllByTestId('sharedListOverflowCardActionItemExport');
      expect(allExportActions).toEqual([]);
    });
  });
});
