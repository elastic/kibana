/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { TRUSTED_APPS_PATH } from '../../../../../common/constants';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { TrustedAppsList } from './trusted_apps_list';
import { exceptionsListAllHttpMocks } from '../../../mocks/exceptions_list_http_mocks';
import { SEARCHABLE_FIELDS } from '../constants';
import { parseQueryFilterToKQL } from '../../../common/utils';

jest.mock('../../../../common/components/user_privileges');

describe('When on the trusted applications page', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;
  let apiMocks: ReturnType<typeof exceptionsListAllHttpMocks>;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = () => (renderResult = mockedContext.render(<TrustedAppsList />));

    apiMocks = exceptionsListAllHttpMocks(mockedContext.coreStart.http);

    act(() => {
      history.push(TRUSTED_APPS_PATH);
    });
  });

  it('should search using expected exception item fields', async () => {
    const expectedFilterString = parseQueryFilterToKQL('fooFooFoo', SEARCHABLE_FIELDS);
    const { findAllByTestId } = render();
    await waitFor(async () => {
      await expect(findAllByTestId('trustedAppsListPage-card')).resolves.toHaveLength(10);
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
});
