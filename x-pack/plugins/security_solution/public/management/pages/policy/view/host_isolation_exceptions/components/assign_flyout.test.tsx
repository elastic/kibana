/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { getFoundExceptionListItemSchemaMock } from '../../../../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
import { EndpointDocGenerator } from '../../../../../../../common/endpoint/generate_data';
import { PolicyData } from '../../../../../../../common/endpoint/types';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { getPolicyHostIsolationExceptionsPath } from '../../../../../common/routing';
import { getHostIsolationExceptionItems } from '../../../../host_isolation_exceptions/service';
import { PolicyHostIsolationExceptionsAssignFlyout } from './assign_flyout';

jest.mock('../../../../host_isolation_exceptions/service');

const getHostIsolationExceptionItemsMock = getHostIsolationExceptionItems as jest.Mock;
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
          filter: `((not exception-list-agnostic.attributes.tags:"policy:${policyId}" AND not exception-list-agnostic.attributes.tags:"policy:all")) AND ((exception-list-agnostic.attributes.name:(*no*results*with*this*) OR exception-list-agnostic.attributes.description:(*no*results*with*this*) OR exception-list-agnostic.attributes.entries.value:(*no*results*with*this*)))`,
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
});
