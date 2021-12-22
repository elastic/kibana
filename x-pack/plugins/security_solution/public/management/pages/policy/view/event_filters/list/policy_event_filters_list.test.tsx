/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import uuid from 'uuid';
import { getExceptionListItemSchemaMock } from '../../../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { getPolicyEventFiltersPath } from '../../../../../common/routing';
import { eventFiltersListQueryHttpMock } from '../../../../event_filters/test_utils';
import { PolicyEventFiltersList } from './policy_event_filters_list';

describe('Policy details event filters list', () => {
  let policyId: string;
  let render: () => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;
  let mockedApi: ReturnType<typeof eventFiltersListQueryHttpMock>;

  beforeEach(() => {
    policyId = uuid.v4();
    mockedContext = createAppRootMockRenderer();
    mockedApi = eventFiltersListQueryHttpMock(mockedContext.coreStart.http);
    ({ history } = mockedContext);
    render = async () => {
      await act(async () => {
        renderResult = mockedContext.render(<PolicyEventFiltersList policyId={policyId} />);
        await waitFor(mockedApi.responseProvider.eventFiltersList);
      });
      return renderResult;
    };

    act(() => {
      history.push(getPolicyEventFiltersPath(policyId));
    });
  });

  it('should display a searchbar and count even with no exceptions', async () => {
    mockedApi.responseProvider.eventFiltersList.mockReturnValue({
      total: 0,
      page: 1,
      per_page: 10,
      data: [],
    });
    await render();
    expect(renderResult.getByTestId('policyDetailsEventFiltersSearchCount')).toHaveTextContent(
      'Showing 0 exceptions'
    );
    expect(renderResult.getByTestId('searchField')).toBeTruthy();
  });

  it('should render the list of exceptions collapsed and expand it when clicked', async () => {
    mockedApi.responseProvider.eventFiltersList.mockReturnValue({
      total: 3,
      page: 1,
      per_page: 10,
      data: Array.from({ length: 3 }, () => getExceptionListItemSchemaMock()),
    });
    await render();
    expect(renderResult.getAllByTestId('eventFilters-collapsed-list-card')).toHaveLength(3);
    expect(
      renderResult.queryAllByTestId('eventFilters-collapsed-list-card-criteriaConditions')
    ).toHaveLength(0);
  });

  it('should expand an item when expand is clicked', async () => {
    await render();
    expect(renderResult.getAllByTestId('eventFilters-collapsed-list-card')).toHaveLength(1);

    userEvent.click(
      renderResult.getByTestId('eventFilters-collapsed-list-card-header-expandCollapse')
    );

    expect(
      renderResult.queryAllByTestId('eventFilters-collapsed-list-card-criteriaConditions')
    ).toHaveLength(1);
  });

  it('should change the address location when a filter is applied', async () => {
    await render();
    userEvent.type(renderResult.getByTestId('searchField'), 'search me{enter}');
    expect(history.location.search).toBe('?filter=search%20me');
  });
});
