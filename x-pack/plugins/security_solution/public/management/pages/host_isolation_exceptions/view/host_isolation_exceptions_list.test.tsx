/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { getFoundExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
import { HOST_ISOLATION_EXCEPTIONS_PATH } from '../../../../../common/constants';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { getHostIsolationExceptionItems } from '../service';
import { HostIsolationExceptionsList } from './host_isolation_exceptions_list';
import { useUserPrivileges as _useUserPrivileges } from '../../../../common/components/user_privileges';
import { EndpointPrivileges } from '../../../../../common/endpoint/types';

jest.mock('../service');
jest.mock('../../../../common/hooks/use_license');
jest.mock('../../../../common/components/user_privileges');

const getHostIsolationExceptionItemsMock = getHostIsolationExceptionItems as jest.Mock;

describe('When on the host isolation exceptions page', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;

  const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

  const setEndpointPrivileges = (overrides: Partial<EndpointPrivileges> = {}) => {
    const newPrivileges = _useUserPrivileges();

    useUserPrivilegesMock.mockReturnValue({
      ...newPrivileges,
      endpointPrivileges: {
        ...newPrivileges.endpointPrivileges,
        ...overrides,
      },
    });
  };

  const waitForApiCall = () => {
    return waitFor(() => expect(getHostIsolationExceptionItemsMock).toHaveBeenCalled());
  };

  beforeEach(() => {
    getHostIsolationExceptionItemsMock.mockClear();
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = () => (renderResult = mockedContext.render(<HostIsolationExceptionsList />));

    act(() => {
      history.push(HOST_ISOLATION_EXCEPTIONS_PATH);
    });
  });

  describe('When on the host isolation list page', () => {
    describe('And no data exists', () => {
      beforeEach(async () => {
        getHostIsolationExceptionItemsMock.mockReturnValue({
          data: [],
          page: 1,
          per_page: 10,
          total: 0,
        });
      });

      it('should show the Empty message', async () => {
        render();
        await waitForApiCall();
        expect(renderResult.getByTestId('hostIsolationExceptionsEmpty')).toBeTruthy();
      });

      it('should not display the search bar', async () => {
        render();
        await waitForApiCall();
        expect(renderResult.queryByTestId('searchExceptions')).toBeFalsy();
      });
    });

    describe('And data exists', () => {
      beforeEach(async () => {
        getHostIsolationExceptionItemsMock.mockImplementation(getFoundExceptionListItemSchemaMock);
      });

      it('should show loading indicator while retrieving data and hide it when it gets it', async () => {
        let releaseApiResponse: (value?: unknown) => void;

        // make the request wait
        getHostIsolationExceptionItemsMock.mockReturnValue(
          new Promise((resolve) => (releaseApiResponse = resolve))
        );
        render();
        await waitForApiCall();

        // see if loader is present
        expect(renderResult.getByTestId('hostIsolationExceptionsContent-loader')).toBeTruthy();

        // release the request
        releaseApiResponse!(getFoundExceptionListItemSchemaMock());

        //  check the loader is gone
        await waitForElementToBeRemoved(
          renderResult.getByTestId('hostIsolationExceptionsContent-loader')
        );
      });

      it('should display the search bar and item count', async () => {
        render();
        await waitForApiCall();
        expect(renderResult.getByTestId('searchExceptions')).toBeTruthy();
        expect(renderResult.getByTestId('hostIsolationExceptions-totalCount').textContent).toBe(
          'Showing 1 exception'
        );
      });

      it('should show items on the list', async () => {
        render();
        await waitForApiCall();

        expect(renderResult.getByTestId('hostIsolationExceptionsCard')).toBeTruthy();
      });

      it('should show API error if one is encountered', async () => {
        getHostIsolationExceptionItemsMock.mockImplementation(() => {
          throw new Error('Server is too far away');
        });
        render();
        await waitForApiCall();
        expect(
          renderResult.getByTestId('hostIsolationExceptionsContent-error').textContent
        ).toEqual(' Server is too far away');
      });

      it('should show the searchbar when no results from search', async () => {
        // render the page with data
        render();
        await waitForApiCall();

        // check if the searchbar is there
        expect(renderResult.getByTestId('searchExceptions')).toBeTruthy();

        // simulate a no-data scenario
        getHostIsolationExceptionItemsMock.mockReturnValueOnce({
          data: [],
          page: 1,
          per_page: 10,
          total: 0,
        });

        // type something to search and press the button
        userEvent.type(renderResult.getByTestId('searchField'), 'this does not exists');
        userEvent.click(renderResult.getByTestId('searchButton'));

        // wait for the page render
        await waitFor(() =>
          expect(getHostIsolationExceptionItemsMock).toHaveBeenLastCalledWith({
            filter:
              '(exception-list-agnostic.attributes.name:(*this*does*not*exists*) OR exception-list-agnostic.attributes.description:(*this*does*not*exists*) OR exception-list-agnostic.attributes.entries.value:(*this*does*not*exists*))',
            http: mockedContext.coreStart.http,
            page: 1,
            perPage: 10,
          })
        );

        // check the url changed
        expect(mockedContext.history.location.search).toBe('?filter=this%20does%20not%20exists');

        // check the searchbar is still there
        expect(renderResult.getByTestId('searchExceptions')).toBeTruthy();
      });
    });

    describe('has canIsolateHost privileges', () => {
      beforeEach(async () => {
        setEndpointPrivileges({ canIsolateHost: true });
        getHostIsolationExceptionItemsMock.mockImplementation(getFoundExceptionListItemSchemaMock);
      });

      it('should show the create flyout when the add button is pressed', async () => {
        render();
        await waitForApiCall();
        userEvent.click(renderResult.getByTestId('hostIsolationExceptionsListAddButton'));
        await waitForApiCall();
        expect(renderResult.getByTestId('hostIsolationExceptionsCreateEditFlyout')).toBeTruthy();
      });

      it('should show the create flyout when the show location is create', async () => {
        history.push(`${HOST_ISOLATION_EXCEPTIONS_PATH}?show=create`);
        render();
        await waitForApiCall();
        expect(renderResult.getByTestId('hostIsolationExceptionsCreateEditFlyout')).toBeTruthy();
        expect(renderResult.queryByTestId('hostIsolationExceptionsCreateEditFlyout')).toBeTruthy();
      });
    });

    describe('does not have canIsolateHost privileges', () => {
      beforeEach(() => {
        setEndpointPrivileges({ canIsolateHost: false });
      });

      it('should not show the create flyout if the user navigates to the create url', () => {
        history.push(`${HOST_ISOLATION_EXCEPTIONS_PATH}?show=create`);
        render();
        expect(renderResult.queryByTestId('hostIsolationExceptionsCreateEditFlyout')).toBeFalsy();
      });

      it('should not show the create flyout if the user navigates to the edit url', () => {
        history.push(`${HOST_ISOLATION_EXCEPTIONS_PATH}?show=edit`);
        render();
        expect(renderResult.queryByTestId('hostIsolationExceptionsCreateEditFlyout')).toBeFalsy();
      });
    });
  });
});
