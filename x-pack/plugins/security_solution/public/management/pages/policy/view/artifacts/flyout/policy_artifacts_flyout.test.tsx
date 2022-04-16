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
import { getFoundExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/found_exception_list_item_schema.mock';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { EndpointDocGenerator } from '../../../../../../../common/endpoint/generate_data';
import { PolicyData } from '../../../../../../../common/endpoint/types';
import { MANAGEMENT_DEFAULT_PAGE } from '../../../../../common/constants';
import { eventFiltersListQueryHttpMock } from '../../../../event_filters/test_utils';
import { MAX_ALLOWED_RESULTS, PolicyArtifactsFlyout } from './policy_artifacts_flyout';
import { parseQueryFilterToKQL, parsePoliciesAndFilterToKql } from '../../../../../common/utils';
import { SEARCHABLE_FIELDS } from '../../../../event_filters/constants';
import {
  FoundExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { cleanEventFilterToUpdate } from '../../../../event_filters/service/service_actions';
import { EventFiltersApiClient } from '../../../../event_filters/service/event_filters_api_client';
import { POLICY_ARTIFACT_FLYOUT_LABELS } from './translations';

const getDefaultQueryParameters = (customFilter: string | undefined = '') => ({
  path: '/api/exception_lists/items/_find',
  query: {
    filter: customFilter,
    list_id: ['endpoint_event_filters'],
    namespace_type: ['agnostic'],
    page: MANAGEMENT_DEFAULT_PAGE + 1,
    per_page: MAX_ALLOWED_RESULTS,
    sort_field: 'created_at',
    sort_order: 'desc',
  },
});
const getEmptyList = () => ({
  data: [],
  page: 1,
  per_page: 10,
  total: 0,
});

const getCleanedExceptionWithNewTags = (
  exception: UpdateExceptionListItemSchema,
  testTags: string[],
  policy: PolicyData
) => {
  const exceptionToUpdateWithNewTags = {
    ...exception,
    tags: [...testTags, `policy:${policy.id}`],
  };

  return cleanEventFilterToUpdate(exceptionToUpdateWithNewTags);
};

describe('Policy details artifacts flyout', () => {
  let render: () => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let mockedContext: AppContextTestRender;
  let mockedApi: ReturnType<typeof eventFiltersListQueryHttpMock>;
  let policy: PolicyData;
  let onCloseMock: jest.Mock;

  beforeEach(() => {
    const endpointGenerator = new EndpointDocGenerator('seed');
    policy = endpointGenerator.generatePolicyPackagePolicy();
    mockedContext = createAppRootMockRenderer();
    mockedApi = eventFiltersListQueryHttpMock(mockedContext.coreStart.http);
    onCloseMock = jest.fn();
    render = async () => {
      await act(async () => {
        renderResult = mockedContext.render(
          <PolicyArtifactsFlyout
            policyItem={policy}
            labels={POLICY_ARTIFACT_FLYOUT_LABELS}
            apiClient={EventFiltersApiClient.getInstance(mockedContext.coreStart.http)}
            onClose={onCloseMock}
            searchableFields={[...SEARCHABLE_FIELDS]}
          />
        );
        await waitFor(mockedApi.responseProvider.eventFiltersList);
      });
      return renderResult;
    };
  });

  it('should render a list of assignable policies and searchbar', async () => {
    mockedApi.responseProvider.eventFiltersList.mockImplementation(() => {
      return getFoundExceptionListItemSchemaMock(1);
    });
    await render();
    expect(mockedApi.responseProvider.eventFiltersList).toHaveBeenCalledWith(
      getDefaultQueryParameters(
        parsePoliciesAndFilterToKql({
          excludedPolicies: [policy.id, 'all'],
          kuery: parseQueryFilterToKQL('', SEARCHABLE_FIELDS),
        })
      )
    );
    expect(await renderResult.findByTestId('artifactsList')).toBeTruthy();
    expect(renderResult.getByTestId('searchField')).toBeTruthy();
  });

  it('should render "no items found" when searched for a term without data', async () => {
    // first render
    mockedApi.responseProvider.eventFiltersList.mockImplementationOnce(() => {
      return getFoundExceptionListItemSchemaMock(1);
    });
    await render();
    expect(await renderResult.findByTestId('artifactsList')).toBeTruthy();

    // results for search
    mockedApi.responseProvider.eventFiltersList.mockImplementationOnce(() => getEmptyList());

    // do a search
    userEvent.type(renderResult.getByTestId('searchField'), 'no results with this{enter}');

    await waitFor(() => {
      expect(mockedApi.responseProvider.eventFiltersList).toHaveBeenCalledWith(
        getDefaultQueryParameters(
          parsePoliciesAndFilterToKql({
            excludedPolicies: [policy.id, 'all'],
            kuery: parseQueryFilterToKQL('no results with this', SEARCHABLE_FIELDS),
          })
        )
      );
      expect(renderResult.getByTestId('artifacts-no-items-found')).toBeTruthy();
    });
  });

  it('should render "not assignable items" when no possible exceptions can be assigned', async () => {
    // both exceptions list requests will return no results
    mockedApi.responseProvider.eventFiltersList.mockImplementation(() => getEmptyList());
    await render();
    expect(await renderResult.findByTestId('artifacts-no-assignable-items')).toBeTruthy();
  });

  it('should disable the submit button if no exceptions are selected', async () => {
    mockedApi.responseProvider.eventFiltersList.mockImplementationOnce(() => {
      return getFoundExceptionListItemSchemaMock(1);
    });
    await render();
    expect(await renderResult.findByTestId('artifactsList')).toBeTruthy();
    expect(renderResult.getByTestId('artifacts-assign-confirm-button')).toBeDisabled();
  });

  it('should enable the submit button if an exception is selected', async () => {
    const exceptions = getFoundExceptionListItemSchemaMock(1);
    const firstOneName = exceptions.data[0].name;
    mockedApi.responseProvider.eventFiltersList.mockImplementation(() => exceptions);

    await render();
    expect(await renderResult.findByTestId('artifactsList')).toBeTruthy();

    // click the first item
    userEvent.click(renderResult.getByTestId(`${firstOneName}_checkbox`));

    expect(renderResult.getByTestId('artifacts-assign-confirm-button')).toBeEnabled();
  });

  it('should warn the user when there are over 100 results in the flyout', async () => {
    mockedApi.responseProvider.eventFiltersList.mockImplementation(() => {
      return {
        ...getFoundExceptionListItemSchemaMock(1),
        total: 120,
      };
    });
    await render();
    expect(await renderResult.findByTestId('artifactsList')).toBeTruthy();
    expect(renderResult.getByTestId('artifacts-too-many-results')).toBeTruthy();
  });

  describe('when submitting the form', () => {
    const FIRST_ONE_NAME = uuid.v4();
    const SECOND_ONE_NAME = uuid.v4();
    const testTags = ['policy:1234', 'non-policy-tag', 'policy:4321'];
    let exceptions: FoundExceptionListItemSchema;

    beforeEach(async () => {
      exceptions = {
        ...getEmptyList(),
        total: 2,
        data: [
          getExceptionListItemSchemaMock({
            name: FIRST_ONE_NAME,
            id: uuid.v4(),
            tags: testTags,
          }),
          getExceptionListItemSchemaMock({
            name: SECOND_ONE_NAME,
            id: uuid.v4(),
            tags: testTags,
          }),
        ],
      };
      mockedApi.responseProvider.eventFiltersList.mockImplementation(() => exceptions);

      await render();
      // wait fo the list to render
      expect(await renderResult.findByTestId('artifactsList')).toBeTruthy();
    });

    it('should submit the exception when submit is pressed (1 exception), display a toast and close the flyout', async () => {
      mockedApi.responseProvider.eventFiltersUpdateOne.mockImplementation(() => exceptions.data[0]);
      // click the first item
      userEvent.click(renderResult.getByTestId(`${FIRST_ONE_NAME}_checkbox`));
      // submit the form
      userEvent.click(renderResult.getByTestId('artifacts-assign-confirm-button'));

      // verify the request with the new tag
      await waitFor(() => {
        expect(mockedApi.responseProvider.eventFiltersUpdateOne).toHaveBeenCalledWith({
          body: JSON.stringify(
            getCleanedExceptionWithNewTags(exceptions.data[0], testTags, policy)
          ),
          path: '/api/exception_lists/items',
        });
      });

      await waitFor(() => {
        expect(mockedContext.coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
          text: `"${FIRST_ONE_NAME}" has been added to your artifacts list.`,
          title: 'Success',
        });
      });
      expect(onCloseMock).toHaveBeenCalled();
    });

    it('should submit the exception when submit is pressed (2 exceptions), display a toast and close the flyout', async () => {
      // click the first  two items
      userEvent.click(renderResult.getByTestId(`${FIRST_ONE_NAME}_checkbox`));
      userEvent.click(renderResult.getByTestId(`${SECOND_ONE_NAME}_checkbox`));
      // submit the form
      userEvent.click(renderResult.getByTestId('artifacts-assign-confirm-button'));

      // verify the request with the new tag
      await waitFor(() => {
        // first exception
        expect(mockedApi.responseProvider.eventFiltersUpdateOne).toHaveBeenCalledWith({
          body: JSON.stringify(
            getCleanedExceptionWithNewTags(exceptions.data[0], testTags, policy)
          ),
          path: '/api/exception_lists/items',
        });
        // second exception
        expect(mockedApi.responseProvider.eventFiltersUpdateOne).toHaveBeenCalledWith({
          body: JSON.stringify(
            getCleanedExceptionWithNewTags(exceptions.data[0], testTags, policy)
          ),
          path: '/api/exception_lists/items',
        });
      });

      await waitFor(() => {
        expect(mockedContext.coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
          text: '2 artifacts have been added to your list.',
          title: 'Success',
        });
      });
      expect(onCloseMock).toHaveBeenCalled();
    });

    it('should show a toast error when the request fails', async () => {
      mockedApi.responseProvider.eventFiltersUpdateOne.mockImplementation(() => {
        throw new Error('the server is too far away');
      });
      // click first item
      userEvent.click(renderResult.getByTestId(`${FIRST_ONE_NAME}_checkbox`));
      // submit the form
      userEvent.click(renderResult.getByTestId('artifacts-assign-confirm-button'));

      await waitFor(() => {
        expect(mockedContext.coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith(
          'An error occurred updating artifacts'
        );
      });
    });
  });
});
