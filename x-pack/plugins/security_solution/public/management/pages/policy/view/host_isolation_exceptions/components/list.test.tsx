/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import uuid from 'uuid';
import { getExceptionListItemSchemaMock } from '../../../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getFoundExceptionListItemSchemaMock } from '../../../../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { getPolicyHostIsolationExceptionsPath } from '../../../../../common/routing';
import { PolicyHostIsolationExceptionsList } from './list';

jest.mock('../../../../../../common/components/user_privileges');

const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

const emptyList = {
  data: [],
  page: 1,
  per_page: 10,
  total: 0,
};

describe('Policy details host isolation exceptions tab', () => {
  let policyId: string;
  let render: (
    exceptions: FoundExceptionListItemSchema
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    policyId = uuid.v4();
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: {
        canIsolateHost: true,
      },
    });
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = (exceptions: FoundExceptionListItemSchema) =>
      (renderResult = mockedContext.render(
        <PolicyHostIsolationExceptionsList policyId={policyId} exceptions={exceptions} />
      ));

    act(() => {
      history.push(getPolicyHostIsolationExceptionsPath(policyId));
    });
  });

  it('should display a searchbar and count even with no exceptions', () => {
    render(emptyList);
    expect(
      renderResult.getByTestId('policyDetailsHostIsolationExceptionsSearchCount')
    ).toHaveTextContent('Showing 0 host isolation exceptions');
    expect(renderResult.getByTestId('searchField')).toBeTruthy();
  });

  it('should render the list of exceptions collapsed and expand it when clicked', () => {
    // render 3
    render(getFoundExceptionListItemSchemaMock(3));
    expect(renderResult.getAllByTestId('hostIsolationExceptions-collapsed-list-card')).toHaveLength(
      3
    );
    expect(
      renderResult.queryAllByTestId(
        'hostIsolationExceptions-collapsed-list-card-criteriaConditions'
      )
    ).toHaveLength(0);
  });

  it('should expand an item when expand is clicked', () => {
    render(getFoundExceptionListItemSchemaMock(1));
    expect(renderResult.getAllByTestId('hostIsolationExceptions-collapsed-list-card')).toHaveLength(
      1
    );

    userEvent.click(
      renderResult.getByTestId('hostIsolationExceptions-collapsed-list-card-header-expandCollapse')
    );

    expect(
      renderResult.queryAllByTestId(
        'hostIsolationExceptions-collapsed-list-card-criteriaConditions'
      )
    ).toHaveLength(1);
  });

  it('should change the address location when a filter is applied', () => {
    render(getFoundExceptionListItemSchemaMock(1));
    userEvent.type(renderResult.getByTestId('searchField'), 'search me{enter}');
    expect(history.location.search).toBe('?filter=search%20me');
  });

  it('should disable the "remove from policy" option to global exceptions', () => {
    const testException = getExceptionListItemSchemaMock({ tags: ['policy:all'] });
    const exceptions = {
      ...emptyList,
      data: [testException],
      total: 1,
    };
    render(exceptions);
    // click the actions button
    userEvent.click(
      renderResult.getByTestId('hostIsolationExceptions-collapsed-list-card-header-actions-button')
    );
    expect(renderResult.getByTestId('remove-from-policy-action')).toBeDisabled();
  });

  it('should enable the "remove from policy" option to policy-specific exceptions ', () => {
    const testException = getExceptionListItemSchemaMock({
      tags: [`policy:${policyId}`, 'policy:1234', 'not-a-policy-tag'],
    });
    const exceptions = {
      ...emptyList,
      data: [testException],
      total: 1,
    };
    render(exceptions);
    // click the actions button
    userEvent.click(
      renderResult.getByTestId('hostIsolationExceptions-collapsed-list-card-header-actions-button')
    );
    expect(renderResult.getByTestId('remove-from-policy-action')).toBeEnabled();
  });

  it('should enable the "view full details" action', () => {
    render(getFoundExceptionListItemSchemaMock(1));
    // click the actions button
    userEvent.click(
      renderResult.getByTestId('hostIsolationExceptions-collapsed-list-card-header-actions-button')
    );
    expect(renderResult.queryByTestId('view-full-details-action')).toBeTruthy();
  });

  it('should render the delete dialog when the "remove from policy" button is clicked', () => {
    const testException = getExceptionListItemSchemaMock({
      tags: [`policy:${policyId}`, 'policy:1234', 'not-a-policy-tag'],
    });
    const exceptions = {
      ...emptyList,
      data: [testException],
      total: 1,
    };
    render(exceptions);
    // click the actions button
    userEvent.click(
      renderResult.getByTestId('hostIsolationExceptions-collapsed-list-card-header-actions-button')
    );
    userEvent.click(renderResult.getByTestId('remove-from-policy-action'));

    // check the dialog is there
    expect(renderResult.getByTestId('remove-from-policy-dialog')).toBeTruthy();
  });

  describe('without privileges', () => {
    beforeEach(() => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          canIsolateHost: false,
        },
      });
    });

    it('should not display the delete action, do show the full details', () => {
      render(getFoundExceptionListItemSchemaMock(1));
      // click the actions button
      userEvent.click(
        renderResult.getByTestId(
          'hostIsolationExceptions-collapsed-list-card-header-actions-button'
        )
      );
      expect(renderResult.queryByTestId('remove-from-policy-action')).toBeFalsy();
      expect(renderResult.queryByTestId('view-full-details-action')).toBeTruthy();
    });
  });
});
