/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { getFoundExceptionListItemSchemaMock } from '../../../../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { EndpointDocGenerator } from '../../../../../../../common/endpoint/generate_data';
import { PolicyData } from '../../../../../../../common/endpoint/types';
import { getPolicyEventFiltersPath } from '../../../../../common/routing';
import { eventFiltersListQueryHttpMock } from '../../../../event_filters/test_utils';
import { PolicyEventFiltersList } from './policy_event_filters_list';
import { parseQueryFilterToKQL, parsePoliciesAndFilterToKql } from '../../../../../common/utils';
import { SEARCHABLE_FIELDS } from '../../../../event_filters/constants';
import { getEndpointPrivilegesInitialStateMock } from '../../../../../../common/components/user_privileges/endpoint/mocks';

const endpointGenerator = new EndpointDocGenerator('seed');
const getDefaultQueryParameters = (customFilter: string | undefined = '') => ({
  path: '/api/exception_lists/items/_find',
  query: {
    filter: customFilter,
    list_id: ['endpoint_event_filters'],
    namespace_type: ['agnostic'],
    page: 1,
    per_page: 10,
    sort_field: undefined,
    sort_order: undefined,
  },
});

describe('Policy details event filters list', () => {
  let render: () => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;
  let mockedApi: ReturnType<typeof eventFiltersListQueryHttpMock>;
  let policy: PolicyData;

  beforeEach(() => {
    policy = endpointGenerator.generatePolicyPackagePolicy();
    mockedContext = createAppRootMockRenderer();
    mockedApi = eventFiltersListQueryHttpMock(mockedContext.coreStart.http);
    ({ history } = mockedContext);
    render = async () => {
      await act(async () => {
        renderResult = mockedContext.render(<PolicyEventFiltersList policy={policy} />);
        await waitFor(mockedApi.responseProvider.eventFiltersList);
      });
      return renderResult;
    };

    history.push(getPolicyEventFiltersPath(policy.id));
  });

  it('should display a searchbar and count even with no exceptions', async () => {
    mockedApi.responseProvider.eventFiltersList.mockReturnValue(
      getFoundExceptionListItemSchemaMock(0)
    );
    await render();
    expect(renderResult.getByTestId('policyDetailsEventFiltersSearchCount')).toHaveTextContent(
      'Showing 0 event filters'
    );
    expect(renderResult.getByTestId('searchField')).toBeTruthy();
  });

  it('should render the list of exceptions collapsed', async () => {
    mockedApi.responseProvider.eventFiltersList.mockReturnValue(
      getFoundExceptionListItemSchemaMock(3)
    );
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

  it('should call query with and without a filter', async () => {
    await render();
    expect(mockedApi.responseProvider.eventFiltersList).toHaveBeenLastCalledWith(
      getDefaultQueryParameters(
        parsePoliciesAndFilterToKql({
          policies: [policy.id, 'all'],
          kuery: parseQueryFilterToKQL('', SEARCHABLE_FIELDS),
        })
      )
    );
    userEvent.type(renderResult.getByTestId('searchField'), 'search me{enter}');
    await waitFor(mockedApi.responseProvider.eventFiltersList);
    expect(mockedApi.responseProvider.eventFiltersList).toHaveBeenLastCalledWith(
      getDefaultQueryParameters(
        parsePoliciesAndFilterToKql({
          policies: [policy.id, 'all'],
          kuery: parseQueryFilterToKQL('search me', SEARCHABLE_FIELDS),
        })
      )
    );
  });

  it('should enable the "view full details" action', async () => {
    mockedApi.responseProvider.eventFiltersList.mockReturnValue(
      getFoundExceptionListItemSchemaMock()
    );
    await render();
    // click the actions button
    userEvent.click(
      renderResult.getByTestId('eventFilters-collapsed-list-card-header-actions-button')
    );
    expect(renderResult.queryByTestId('view-full-details-action')).toBeTruthy();
  });

  it('does not show remove option in actions menu if license is downgraded to gold or below', async () => {
    getEndpointPrivilegesInitialStateMock({
      canCreateArtifactsByPolicy: false,
    });
    mockedApi.responseProvider.eventFiltersList.mockReturnValue(
      getFoundExceptionListItemSchemaMock()
    );
    await render();
    userEvent.click(
      renderResult.getByTestId('eventFilters-collapsed-list-card-header-actions-button')
    );

    expect(renderResult.queryByTestId('remove-from-policy-action')).toBeNull();
  });
});
