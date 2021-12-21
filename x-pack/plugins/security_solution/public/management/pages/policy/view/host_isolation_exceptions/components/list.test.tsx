/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { act } from '@testing-library/react';
import React from 'react';
import uuid from 'uuid';
import { getPolicyHostIsolationExceptionsPath } from '../../../../../common/routing';
import { getFoundExceptionListItemSchemaMock } from '../../../../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { PolicyHostIsolationExceptionsList } from './list';
import userEvent from '@testing-library/user-event';

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
    ).toHaveTextContent('Showing 0 exceptions');
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
});
