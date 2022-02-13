/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import uuid from 'uuid';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import { getExceptionListItemSchemaMock } from '../../../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getFoundExceptionListItemSchemaMock } from '../../../../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
import { EndpointDocGenerator } from '../../../../../../../common/endpoint/generate_data';
import { PolicyData } from '../../../../../../../common/endpoint/types';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { getPolicyHostIsolationExceptionsPath } from '../../../../../common/routing';
import {
  getHostIsolationExceptionItems,
  updateOneHostIsolationExceptionItem,
} from '../../../../host_isolation_exceptions/service';
import { PolicyHostIsolationExceptionsAssignFlyout } from './assign_flyout';

jest.mock('../../../../host_isolation_exceptions/service');
jest.mock('../../../../../../common/components/user_privileges');

const useUserPrivilegesMock = useUserPrivileges as jest.Mock;
const getHostIsolationExceptionItemsMock = getHostIsolationExceptionItems as jest.Mock;
const updateOneHostIsolationExceptionItemMock = updateOneHostIsolationExceptionItem as jest.Mock;
const endpointGenerator = new EndpointDocGenerator('seed');
const emptyList = {
  data: [],
  page: 1,
  per_page: 10,
  total: 0,
};

describe('Policy details host isolation exceptions assign flyout', () => {
  let policyId: string;
  let policy: PolicyData;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;
  let onClose: () => void;

  beforeEach(() => {
    getHostIsolationExceptionItemsMock.mockClear();
    updateOneHostIsolationExceptionItemMock.mockClear();
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: {
        canIsolateHost: true,
      },
    });
    policy = endpointGenerator.generatePolicyPackagePolicy();
    policyId = policy.id;
    mockedContext = createAppRootMockRenderer();
    onClose = jest.fn();
    ({ history } = mockedContext);
    render = () =>
      (renderResult = mockedContext.render(
        <PolicyHostIsolationExceptionsAssignFlyout policy={policy} onClose={onClose} />
      ));

    history.push(getPolicyHostIsolationExceptionsPath(policyId, { show: 'list' }));
  });

  it('should render a list of assignable policies and searchbar', async () => {
    getHostIsolationExceptionItemsMock.mockImplementation(() => {
      return getFoundExceptionListItemSchemaMock(1);
    });
    render();
    await waitFor(() => {
      expect(getHostIsolationExceptionItemsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: `((not exception-list-agnostic.attributes.tags:"policy:${policyId}" AND not exception-list-agnostic.attributes.tags:"policy:all"))`,
        })
      );
    });
    expect(await renderResult.findByTestId('artifactsList')).toBeTruthy();
    expect(renderResult.getByTestId('searchField')).toBeTruthy();
  });

  it('should render "no items found" when searched for a term without data', async () => {
    // first render
    getHostIsolationExceptionItemsMock.mockImplementationOnce(() => {
      return getFoundExceptionListItemSchemaMock(1);
    });
    render();
    expect(await renderResult.findByTestId('artifactsList')).toBeTruthy();

    // results for search
    getHostIsolationExceptionItemsMock.mockResolvedValueOnce(emptyList);

    // do a search
    userEvent.type(renderResult.getByTestId('searchField'), 'no results with this{enter}');

    await waitFor(() => {
      expect(getHostIsolationExceptionItemsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: `((not exception-list-agnostic.attributes.tags:"policy:${policyId}" AND not exception-list-agnostic.attributes.tags:"policy:all")) AND ((exception-list-agnostic.attributes.item_id:(*no*results*with*this*) OR exception-list-agnostic.attributes.name:(*no*results*with*this*) OR exception-list-agnostic.attributes.description:(*no*results*with*this*) OR exception-list-agnostic.attributes.entries.value:(*no*results*with*this*)))`,
        })
      );
      expect(renderResult.getByTestId('hostIsolationExceptions-no-items-found')).toBeTruthy();
    });
  });

  it('should render "not assignable items" when no possible exceptions can be assigned', async () => {
    // both exceptions list requests will return no results
    getHostIsolationExceptionItemsMock.mockResolvedValue(emptyList);
    render();
    expect(
      await renderResult.findByTestId('hostIsolationExceptions-no-assignable-items')
    ).toBeTruthy();
  });

  it('should disable the submit button if no exceptions are selected', async () => {
    getHostIsolationExceptionItemsMock.mockImplementationOnce(() => {
      return getFoundExceptionListItemSchemaMock(1);
    });
    render();
    expect(await renderResult.findByTestId('artifactsList')).toBeTruthy();
    expect(
      renderResult.getByTestId('hostIsolationExceptions-assign-confirm-button')
    ).toBeDisabled();
  });

  it('should enable the submit button if an exeption is selected', async () => {
    const exceptions = getFoundExceptionListItemSchemaMock(1);
    const firstOneName = exceptions.data[0].name;
    getHostIsolationExceptionItemsMock.mockResolvedValue(exceptions);

    render();
    expect(await renderResult.findByTestId('artifactsList')).toBeTruthy();

    // click the first item
    userEvent.click(renderResult.getByTestId(`${firstOneName}_checkbox`));

    expect(renderResult.getByTestId('hostIsolationExceptions-assign-confirm-button')).toBeEnabled();
  });

  it('should warn the user when there are over 100 results in the flyout', async () => {
    getHostIsolationExceptionItemsMock.mockImplementation(() => {
      return {
        ...getFoundExceptionListItemSchemaMock(1),
        total: 120,
      };
    });
    render();
    expect(await renderResult.findByTestId('artifactsList')).toBeTruthy();
    expect(renderResult.getByTestId('hostIsolationExceptions-too-many-results')).toBeTruthy();
  });

  describe('without privileges', () => {
    beforeEach(() => {
      useUserPrivilegesMock.mockReturnValue({ endpointPrivileges: { canIsolateHost: false } });
    });
    it('should not render if invoked without privileges', () => {
      render();
      expect(renderResult.queryByTestId('hostIsolationExceptions-assign-flyout')).toBeNull();
    });

    it('should call onClose if accessed without privileges', () => {
      render();
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('when submitting the form', () => {
    const FIRST_ONE_NAME = uuid.v4();
    const SECOND_ONE_NAME = uuid.v4();
    const testTags = ['policy:1234', 'non-policy-tag', 'policy:4321'];
    let exceptions: FoundExceptionListItemSchema;

    beforeEach(async () => {
      exceptions = {
        ...emptyList,
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
      getHostIsolationExceptionItemsMock.mockResolvedValue(exceptions);

      render();
      // wait fo the list to render
      expect(await renderResult.findByTestId('artifactsList')).toBeTruthy();
    });

    it('should submit the exception when submit is pressed (1 exception), display a toast and close the flyout', async () => {
      updateOneHostIsolationExceptionItemMock.mockImplementation(async (_http, exception) => {
        return exception;
      });
      // click the first item
      userEvent.click(renderResult.getByTestId(`${FIRST_ONE_NAME}_checkbox`));
      // submit the form
      userEvent.click(renderResult.getByTestId('hostIsolationExceptions-assign-confirm-button'));

      // verify the request with the new tag
      await waitFor(() => {
        expect(updateOneHostIsolationExceptionItemMock).toHaveBeenCalledWith(
          mockedContext.coreStart.http,
          {
            ...exceptions.data[0],
            tags: [...testTags, `policy:${policyId}`],
          }
        );
      });

      await waitFor(() => {
        expect(mockedContext.coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
          text: `"${FIRST_ONE_NAME}" has been added to your host isolation exceptions list.`,
          title: 'Success',
        });
      });
      expect(onClose).toHaveBeenCalled();
    });

    it('should submit the exception when submit is pressed (2 exceptions), display a toast and close the flyout', async () => {
      updateOneHostIsolationExceptionItemMock.mockImplementation(async (_http, exception) => {
        return exception;
      });
      // click the first  two items
      userEvent.click(renderResult.getByTestId(`${FIRST_ONE_NAME}_checkbox`));
      userEvent.click(renderResult.getByTestId(`${SECOND_ONE_NAME}_checkbox`));
      // submit the form
      userEvent.click(renderResult.getByTestId('hostIsolationExceptions-assign-confirm-button'));

      // verify the request with the new tag
      await waitFor(() => {
        // first exception
        expect(updateOneHostIsolationExceptionItemMock).toHaveBeenCalledWith(
          mockedContext.coreStart.http,
          {
            ...exceptions.data[0],
            tags: [...testTags, `policy:${policyId}`],
          }
        );
        // second exception
        expect(updateOneHostIsolationExceptionItemMock).toHaveBeenCalledWith(
          mockedContext.coreStart.http,
          {
            ...exceptions.data[1],
            tags: [...testTags, `policy:${policyId}`],
          }
        );
      });

      await waitFor(() => {
        expect(mockedContext.coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
          text: '2 host isolation exceptions have been added to your list.',
          title: 'Success',
        });
      });
      expect(onClose).toHaveBeenCalled();
    });

    it('should show a toast error when the request fails and close the flyout', async () => {
      updateOneHostIsolationExceptionItemMock.mockRejectedValue(
        new Error('the server is too far away')
      );
      // click first item
      userEvent.click(renderResult.getByTestId(`${FIRST_ONE_NAME}_checkbox`));
      // submit the form
      userEvent.click(renderResult.getByTestId('hostIsolationExceptions-assign-confirm-button'));

      await waitFor(() => {
        expect(mockedContext.coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith(
          'An error occurred updating artifacts'
        );
        expect(onClose).toHaveBeenCalled();
      });
    });
  });
});
