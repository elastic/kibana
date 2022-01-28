/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor } from '@testing-library/react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { sendGetEndpointSpecificPackagePolicies } from '../../../services/policies/policies';
import { sendGetEndpointSpecificPackagePoliciesMock } from '../../../services/policies/test_mock_utilts';
import { PolicyList } from './policy_list';
import { POLICIES_PATH } from '../../../../../common/constants';

jest.mock('../../../services/policies/policies');

(sendGetEndpointSpecificPackagePolicies as jest.Mock).mockImplementation(
  sendGetEndpointSpecificPackagePoliciesMock
);

describe('When on the policy list page', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = () => (renderResult = mockedContext.render(<PolicyList />));

    act(() => {
      history.push(POLICIES_PATH);
    });
  });
  describe('and data exists', () => {
    beforeEach(async () => {
      render();
      await waitFor(() => {
        expect(sendGetEndpointSpecificPackagePolicies).toHaveBeenCalled();
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
  });
});
