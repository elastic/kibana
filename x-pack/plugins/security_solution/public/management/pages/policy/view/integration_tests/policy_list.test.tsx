/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor } from '@testing-library/react';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { sendGetEndpointSpecificPackagePolicies } from '../../../../services/policies/policies';
import { sendGetEndpointSpecificPackagePoliciesMock } from '../../../../services/policies/test_mock_utils';
import { PolicyList, policyListErrorMessage } from '../policy_list';
import type { GetPolicyListResponse } from '../../types';
import { getEndpointListPath, getPoliciesPath } from '../../../../common/routing';
import { APP_UI_ID } from '../../../../../../common/constants';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

jest.mock('../../../../services/policies/policies');
jest.mock('../../../../../common/components/user_privileges');

const getPackagePolicies = sendGetEndpointSpecificPackagePolicies as jest.Mock;
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

// Failing: See https://github.com/elastic/kibana/issues/169133
describe.skip('When on the policy list page', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: { canReadEndpointList: true, canAccessFleet: true, loading: false },
    });

    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = () => (renderResult = mockedContext.render(<PolicyList />));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('on get policy list api failure', () => {
    beforeEach(async () => {
      getPackagePolicies.mockRejectedValueOnce(new Error('mock list failure'));
      render();
    });
    afterEach(() => {
      getPackagePolicies.mockReset();
    });

    it('should show table with error state', async () => {
      expect(renderResult.getByTestId('policyListTable')).toBeTruthy();
      await waitFor(() => {
        expect(renderResult.getByText(policyListErrorMessage)).toBeTruthy();
      });
    });
  });
  describe('and there are no policies', () => {
    beforeEach(async () => {
      getPackagePolicies.mockResolvedValue(
        sendGetEndpointSpecificPackagePoliciesMock({
          page: 1,
          perPage: 20,
          count: 0,
        })
      );
      render();
      await waitFor(() => {
        expect(getPackagePolicies).toHaveBeenCalled();
      });
    });
    afterEach(() => {
      getPackagePolicies.mockReset();
    });
    it('should show the empty page', async () => {
      await waitFor(() => {
        expect(renderResult.getByTestId('emptyPolicyTable')).toBeTruthy();
      });
    });
    it('should show instruction text and a button to add the Endpoint Security integration', async () => {
      await waitFor(() => {
        expect(
          renderResult.getByText(
            'From this page, you’ll be able to view and manage the Elastic Defend Integration policies in your environment running Elastic Defend.'
          )
        ).toBeTruthy();

        expect(renderResult.getByTestId('onboardingStartButton')).toBeTruthy();
      });
    });
  });

  describe('and data exists', () => {
    const policies: GetPolicyListResponse = sendGetEndpointSpecificPackagePoliciesMock({
      agentsPerPolicy: 4,
    });

    beforeEach(async () => {
      getPackagePolicies.mockResolvedValue(policies);
      render();
      await waitFor(() => {
        expect(sendGetEndpointSpecificPackagePolicies).toHaveBeenCalled();
        expect(getPackagePolicies).toHaveBeenCalled();
        expect(renderResult.getByTestId('policyListTable')).toBeTruthy();
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
    it('should show an avatar and name for the Created by column', () => {
      const expectedAvatarName = policies.items[0].created_by;
      const createdByCells = renderResult.getAllByTestId('created-by-avatar');
      const firstCreatedByName = renderResult.getAllByTestId('created-by-name')[0];
      expect(createdByCells).toBeTruthy();
      expect(createdByCells.length).toBe(5);
      expect(createdByCells[0].textContent).toEqual(expectedAvatarName.charAt(0));
      expect(firstCreatedByName.textContent).toEqual(expectedAvatarName);
    });
    it('should show an avatar and name for the Updated by column', () => {
      const expectedAvatarName = policies.items[0].updated_by;
      const updatedByCells = renderResult.getAllByTestId('updated-by-avatar');
      const firstUpdatedByName = renderResult.getAllByTestId('updated-by-name')[0];
      expect(updatedByCells).toBeTruthy();
      expect(updatedByCells.length).toBe(5);
      expect(updatedByCells[0].textContent).toEqual(expectedAvatarName.charAt(0));
      expect(firstUpdatedByName.textContent).toEqual(expectedAvatarName);
    });

    it('should show the correct endpoint count', () => {
      const endpointCount = renderResult.getAllByTestId('policyEndpointCountLink');
      expect(endpointCount[0].textContent).toBe('4');
    });

    it('endpoint count link should navigate to the endpoint list filtered by policy', async () => {
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
      await userEvent.click(endpointCount);

      expect(history.location.pathname).toEqual(getEndpointListPath({ name: 'endpointList' }));
      expect(history.location.search).toEqual(filterByPolicyQuery);
      expect(history.location.state).toEqual(backLink);

      // reset test to the policy page
      act(() => {
        history.push('/administration/policies');
      });
    });
  });
  describe('pagination', () => {
    beforeEach(async () => {
      getPackagePolicies.mockImplementation(({ page, perPage }) => {
        // # policies = 100 to trigger UI to show pagination
        return sendGetEndpointSpecificPackagePoliciesMock({
          page,
          perPage,
          count: 100,
        });
      });
      render();
      await waitFor(() => {
        expect(getPackagePolicies).toHaveBeenCalled();
        expect(sendGetEndpointSpecificPackagePolicies).toHaveBeenCalled();
      });
    });
    afterEach(() => {
      getPackagePolicies.mockReset();
    });
    it('should pass the correct page value to the api', async () => {
      await waitFor(() => {
        expect(renderResult.getByTestId('pagination-button-next')).toBeTruthy();
      });
      await userEvent.click(renderResult.getByTestId('pagination-button-next'));
      await waitFor(() => {
        expect(getPackagePolicies).toHaveBeenCalledTimes(2);
      });
      expect(getPackagePolicies.mock.calls[1][1].query).toEqual({
        page: 2,
        perPage: 10,
        withAgentCount: true,
      });
    });

    it('should pass the correct pageSize value to the api', async () => {
      await waitFor(() => {
        expect(renderResult.getByTestId('tablePaginationPopoverButton')).toBeTruthy();
      });
      await userEvent.click(renderResult.getByTestId('tablePaginationPopoverButton'));
      await waitForEuiPopoverOpen();
      await userEvent.click(renderResult.getByTestId('tablePagination-20-rows'));

      await waitFor(() => {
        expect(getPackagePolicies).toHaveBeenCalledTimes(2);
      });
      expect(getPackagePolicies.mock.calls[1][1].query).toEqual({
        page: 1,
        perPage: 20,
        withAgentCount: true,
      });
    });

    it('should call the api with the initial pagination values taken from the url', async () => {
      act(() => {
        history.push('/administration/policies?page=3&pageSize=50');
      });
      await waitFor(() => {
        expect(getPackagePolicies).toHaveBeenCalledTimes(2);
        expect(getPackagePolicies.mock.calls[1][1].query).toEqual({
          page: 3,
          perPage: 50,
          withAgentCount: true,
        });
      });
    });
    it('should reset page back to 1 if the user is on a page > 1 and they change page size', async () => {
      // setup on a different page
      act(() => {
        history.push('/administration/policies?page=2&pageSize=20');
      });
      await waitFor(() => {
        expect(getPackagePolicies).toHaveBeenCalled();
      });

      // change pageSize
      await userEvent.click(renderResult.getByTestId('tablePaginationPopoverButton'));
      await waitForEuiPopoverOpen();
      await userEvent.click(renderResult.getByTestId('tablePagination-10-rows'));

      await waitFor(() => {
        expect(sendGetEndpointSpecificPackagePolicies).toHaveBeenLastCalledWith(
          expect.any(Object),
          { query: { page: 1, perPage: 10, withAgentCount: true } }
        );
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
        withAgentCount: true,
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
        withAgentCount: true,
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
        withAgentCount: true,
      });
    });
  });
});
