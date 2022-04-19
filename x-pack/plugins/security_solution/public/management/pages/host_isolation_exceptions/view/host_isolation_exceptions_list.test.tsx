/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { HOST_ISOLATION_EXCEPTIONS_PATH } from '../../../../../common/constants';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { HostIsolationExceptionsList } from './host_isolation_exceptions_list';
import { exceptionsListAllHttpMocks } from '../../mocks/exceptions_list_http_mocks';
import { SEARCHABLE_FIELDS } from '../constants';
import { parseQueryFilterToKQL } from '../../../common/utils';
import { useUserPrivileges as _useUserPrivileges } from '../../../../common/components/user_privileges';
import { getUserPrivilegesMockDefaultValue } from '../../../../common/components/user_privileges/__mocks__';
import { getFirstCard } from '../../../components/artifact_list_page/mocks';

jest.mock('../../../../common/components/user_privileges');
const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('When on the host isolation exceptions page', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;
  let apiMocks: ReturnType<typeof exceptionsListAllHttpMocks>;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = () => (renderResult = mockedContext.render(<HostIsolationExceptionsList />));

    apiMocks = exceptionsListAllHttpMocks(mockedContext.coreStart.http);

    act(() => {
      history.push(HOST_ISOLATION_EXCEPTIONS_PATH);
    });
  });

  afterEach(() => {
    useUserPrivilegesMock.mockImplementation(getUserPrivilegesMockDefaultValue);
  });

  it('should search using expected exception item fields', async () => {
    const expectedFilterString = parseQueryFilterToKQL('fooFooFoo', SEARCHABLE_FIELDS);
    const { findAllByTestId } = render();

    await waitFor(async () => {
      await expect(findAllByTestId('hostIsolationExceptionsListPage-card')).resolves.toHaveLength(
        10
      );
    });

    apiMocks.responseProvider.exceptionsFind.mockClear();

    act(() => {
      userEvent.type(renderResult.getByTestId('searchField'), 'fooFooFoo');
    });
    act(() => {
      fireEvent.click(renderResult.getByTestId('searchButton'));
    });

    await waitFor(() => {
      expect(apiMocks.responseProvider.exceptionsFind).toHaveBeenCalled();
    });

    expect(apiMocks.responseProvider.exceptionsFind).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          filter: expectedFilterString,
        }),
      })
    );
  });

  it('should hide the Create and Edit actions when host isolation authz is not allowed', async () => {
    // Use case: license downgrade scenario, where user still has entries defined, but no longer
    // able to create or edit them (only Delete them)
    const existingPrivileges = useUserPrivilegesMock();
    useUserPrivilegesMock.mockReturnValue({
      ...existingPrivileges,
      endpointPrivileges: {
        ...existingPrivileges.endpointPrivileges,
        canIsolateHost: false,
      },
    });

    const { findAllByTestId, queryByTestId, getByTestId } = await render();

    await waitFor(async () => {
      await expect(findAllByTestId('hostIsolationExceptionsListPage-card')).resolves.toHaveLength(
        10
      );
    });
    await getFirstCard(renderResult, {
      showActions: true,
      testId: 'hostIsolationExceptionsListPage',
    });

    expect(queryByTestId('hostIsolationExceptionsListPage-pageAddButton')).toBeNull();
    expect(getByTestId('hostIsolationExceptionsListPage-card-cardDeleteAction')).toBeTruthy();
    expect(queryByTestId('hostIsolationExceptionsListPage-card-cardEditAction')).toBeNull();
  });
});
