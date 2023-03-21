/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { EVENT_FILTERS_PATH } from '../../../../../../common/constants';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { EventFiltersList } from '../event_filters_list';
import { exceptionsListAllHttpMocks } from '../../../../mocks/exceptions_list_http_mocks';
import { SEARCHABLE_FIELDS } from '../../constants';
import { parseQueryFilterToKQL } from '../../../../common/utils';
import type { EndpointPrivileges } from '../../../../../../common/endpoint/types';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';

jest.mock('../../../../../common/components/user_privileges');
const mockUserPrivileges = useUserPrivileges as jest.Mock;

describe('When on the Event Filters list page', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;
  let apiMocks: ReturnType<typeof exceptionsListAllHttpMocks>;
  let mockedEndpointPrivileges: Partial<EndpointPrivileges>;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = () => (renderResult = mockedContext.render(<EventFiltersList />));
    apiMocks = exceptionsListAllHttpMocks(mockedContext.coreStart.http);
    act(() => {
      history.push(EVENT_FILTERS_PATH);
    });

    mockedEndpointPrivileges = { canWriteTrustedApplications: true };
    mockUserPrivileges.mockReturnValue({ endpointPrivileges: mockedEndpointPrivileges });
  });

  afterEach(() => {
    mockUserPrivileges.mockReset();
  });

  it('should search using expected exception item fields', async () => {
    const expectedFilterString = parseQueryFilterToKQL('fooFooFoo', SEARCHABLE_FIELDS);
    const { findAllByTestId } = render();
    await waitFor(async () => {
      await expect(findAllByTestId('EventFiltersListPage-card')).resolves.toHaveLength(10);
    });

    apiMocks.responseProvider.exceptionsFind.mockClear();
    userEvent.type(renderResult.getByTestId('searchField'), 'fooFooFoo');
    userEvent.click(renderResult.getByTestId('searchButton'));
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

  describe('RBAC Event Filters', () => {
    describe('ALL privilege', () => {
      beforeEach(() => {
        mockedEndpointPrivileges.canWriteEventFilters = true;
      });

      it('should enable adding entries', async () => {
        render();

        await waitFor(() =>
          expect(renderResult.queryByTestId('EventFiltersListPage-pageAddButton')).toBeTruthy()
        );
      });

      it('should enable modifying/deleting entries', async () => {
        render();

        const actionsButton = await waitFor(
          () => renderResult.getAllByTestId('EventFiltersListPage-card-header-actions-button')[0]
        );
        userEvent.click(actionsButton);

        expect(renderResult.getByTestId('EventFiltersListPage-card-cardEditAction')).toBeTruthy();
        expect(renderResult.getByTestId('EventFiltersListPage-card-cardDeleteAction')).toBeTruthy();
      });
    });

    describe('READ privilege', () => {
      beforeEach(() => {
        mockedEndpointPrivileges.canWriteEventFilters = false;
      });

      it('should disable adding entries', async () => {
        render();

        await waitFor(() =>
          expect(renderResult.queryByTestId('EventFiltersListPage-container')).toBeTruthy()
        );

        expect(renderResult.queryByTestId('EventFiltersListPage-pageAddButton')).toBeNull();
      });

      it('should disable modifying/deleting entries', async () => {
        render();

        await waitFor(() =>
          expect(renderResult.queryByTestId('EventFiltersListPage-container')).toBeTruthy()
        );

        expect(
          renderResult.queryByTestId('EventFiltersListPage-card-header-actions-button')
        ).toBeNull();
      });
    });
  });
});
