/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, fireEvent } from '@testing-library/react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { sendGetEndpointSpecificPackagePolicies } from '../../../services/policies/policies';
import { sendGetEndpointSpecificPackagePoliciesMock } from '../../../services/policies/test_mock_utils';
import { PolicyList } from './policy_list';
import { sendGetAgentPolicyList } from '../../../services/policies/ingest';
import { GetPolicyListResponse } from '../types';
import { getEndpointListPath, getPoliciesPath } from '../../../common/routing';
import { APP_UI_ID } from '../../../../../common/constants';

jest.mock('../../../services/policies/policies');
jest.mock('../../../services/policies/ingest');

const getPackagePolicies = sendGetEndpointSpecificPackagePolicies as jest.Mock;

const getAgentPolicies = sendGetAgentPolicyList as jest.Mock;

describe('When on the policy list page', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = () => (renderResult = mockedContext.render(<PolicyList />));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('and data exists', () => {
    let policies: GetPolicyListResponse;
    beforeEach(async () => {
      policies = await sendGetEndpointSpecificPackagePoliciesMock();
      getPackagePolicies.mockImplementation(async () => {
        return policies;
      });
      getAgentPolicies.mockResolvedValue({
        items: [
          { package_policies: [policies.items[0].id], agents: 4 },
          { package_policies: [policies.items[1].id], agents: 2 },
          { package_policies: [policies.items[2].id], agents: 5 },
          { package_policies: [policies.items[3].id], agents: 1 },
          { package_policies: [policies.items[4].id], agents: 3 },
        ],
      });
      render();
      await waitFor(() => {
        expect(sendGetEndpointSpecificPackagePolicies).toHaveBeenCalled();
        expect(sendGetAgentPolicyList).toHaveBeenCalled();
      });
    });
    it('should display the policy list table', () => {
      expect(renderResult.getByTestId('policyListTable')).toBeTruthy();
    });
    it('should show a link for the policy name', () => {
      const policyNameCells = renderResult.getAllByTestId('policyNameCellLink');
      expect(policyNameCells).toBeTruthy();
      expect(policyNameCells.length).toBe(5);
    });
    it('should show a avatar for the Created by column', () => {
      const createdByCells = renderResult.getAllByTestId('created-by-avatar');
      expect(createdByCells).toBeTruthy();
      expect(createdByCells.length).toBe(5);
    });
    it('should show a avatar for the Updated by column', () => {
      const updatedByCells = renderResult.getAllByTestId('updated-by-avatar');
      expect(updatedByCells).toBeTruthy();
      expect(updatedByCells.length).toBe(5);
    });
    it('should show the correct endpoint count', () => {
      const endpointCount = renderResult.getAllByTestId('policyEndpointCountLink');
      expect(endpointCount[0].textContent).toBe('4');
    });
    it('endpoint count link should navigate to the endpoint list filtered by policy', () => {
      const policyId = policies.items[0].id;
      const filterByPolicyQuery = `?admin_query=(language:kuery,query:'united.endpoint.Endpoint.policy.applied.id : "${policyId}"')`;
      const backLink = {
        backLink: {
          navigateTo: [
            APP_UI_ID,
            {
              path: getPoliciesPath(),
            },
          ],
          label: 'Back to policy list',
          href: '/app/security/administration/policy',
        },
      };
      const endpointCount = renderResult.getAllByTestId('policyEndpointCountLink')[0];
      fireEvent.click(endpointCount);

      expect(history.location.pathname).toEqual(getEndpointListPath({ name: 'endpointList' }));
      expect(history.location.search).toEqual(filterByPolicyQuery);
      expect(history.location.state).toEqual(backLink);

      // reset test to the policy page
      history.push('/administration/policies');
      render();
    });
  });
  describe('pagination', () => {
    beforeEach(async () => {
      getPackagePolicies.mockImplementation(async ({ page, perPage }) => {
        // # policies = 100 to trigger UI to show pagination
        const response = await sendGetEndpointSpecificPackagePoliciesMock({
          page,
          perPage,
          count: 100,
        });
        return response;
      });
      render();
      await waitFor(() => {
        expect(getPackagePolicies).toHaveBeenCalled();
      });
    });
    afterEach(() => {
      getPackagePolicies.mockReset();
    });
    it('should pass the correct page value to the api', async () => {
      act(() => {
        renderResult.getByTestId('pagination-button-next').click();
      });
      await waitFor(() => {
        expect(getPackagePolicies).toHaveBeenCalledTimes(2);
      });
      expect(getPackagePolicies.mock.calls[1][1].query).toEqual({
        page: 2,
        perPage: 10,
      });
    });
    it('should pass the correct pageSize value to the api', async () => {
      act(() => {
        renderResult.getByTestId('tablePaginationPopoverButton').click();
      });
      const pageSize20 = await renderResult.findByTestId('tablePagination-20-rows');
      act(() => {
        pageSize20.click();
      });

      await waitFor(() => {
        expect(getPackagePolicies).toHaveBeenCalledTimes(2);
      });
      expect(getPackagePolicies.mock.calls[1][1].query).toEqual({
        page: 1,
        perPage: 20,
      });
    });
    it('should call the api with the initial pagination values taken from the url', async () => {
      act(() => {
        history.push('/administration/policies?page=3&pageSize=50');
      });
      await waitFor(() => {
        expect(getPackagePolicies).toHaveBeenCalledTimes(2);
      });
      expect(getPackagePolicies.mock.calls[1][1].query).toEqual({
        page: 3,
        perPage: 50,
      });
    });
    it('should reset page back to 1 if the user is on a page > 1 and they change page size', async () => {
      // setup on a different page
      act(() => {
        history.push('/administration/policies?page=2&pageSize=20');
      });
      await waitFor(() => {
        expect(getPackagePolicies).toHaveBeenCalledTimes(2);
      });

      // change pageSize
      act(() => {
        renderResult.getByTestId('tablePaginationPopoverButton').click();
      });
      const pageSize10 = await renderResult.findByTestId('tablePagination-10-rows');
      act(() => {
        pageSize10.click();
      });

      await waitFor(() => {
        expect(getPackagePolicies).toHaveBeenCalledTimes(3);
      });
      expect(getPackagePolicies.mock.calls[2][1].query).toEqual({
        page: 1,
        perPage: 10,
      });
    });
    it('should set page to 1 if user tries to force an invalid page number', async () => {
      act(() => {
        history.push(`/administration/policies?page=${Number.NEGATIVE_INFINITY}-1&pageSize=20`);
      });
      await waitFor(() => {
        expect(getPackagePolicies).toHaveBeenCalledTimes(2);
      });

      expect(getPackagePolicies.mock.calls[1][1].query).toEqual({
        page: 1,
        perPage: 20,
      });
    });
    it('should set page size to 10 (management default) if page size is set to anything other than 10, 20, or 50', async () => {
      act(() => {
        history.push('/administration/policies?page=2&pageSize=13');
      });
      await waitFor(() => {
        expect(getPackagePolicies).toHaveBeenCalledTimes(2);
      });

      expect(getPackagePolicies.mock.calls[1][1].query).toEqual({
        page: 2,
        perPage: 10,
      });
    });
    it('should set page to last defined page number value if multiple values exist for page in the URL, i.e. page=2&page=4&page=3 then page is set to 3', async () => {
      act(() => {
        history.push('/administration/policies?page=2&page=4&page=3&pageSize=10');
      });
      await waitFor(() => {
        expect(getPackagePolicies).toHaveBeenCalledTimes(2);
      });

      expect(getPackagePolicies.mock.calls[1][1].query).toEqual({
        page: 3,
        perPage: 10,
      });
    });
  });
});
