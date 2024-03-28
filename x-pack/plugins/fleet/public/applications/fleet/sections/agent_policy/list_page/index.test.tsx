/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { fireEvent, waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../mock';
import type { GetAgentPoliciesResponse } from '../../../../../../common';

import { AgentPolicyListPage } from '.';

jest.mock('../../../hooks', () => ({
  ...jest.requireActual('../../../hooks'),
  useGetAgentPoliciesQuery: jest.fn().mockReturnValue({
    data: {
      items: [
        { id: 'not_managed_policy', is_managed: false, updated_at: '2023-04-06T07:19:29.892Z' },
        { id: 'managed_policy', is_managed: true, updated_at: '2023-04-07T07:19:29.892Z' },
      ],
      total: 2,
    } as GetAgentPoliciesResponse,
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

describe('AgentPolicyListPage', () => {
  let renderResult: RenderResult;

  const render = () => {
    const renderer = createFleetTestRendererMock();

    return renderer.render(<AgentPolicyListPage />);
  };

  beforeEach(async () => {
    renderResult = render();

    await waitFor(() => {
      expect(renderResult.queryByText(/Loading agent policies/)).not.toBeInTheDocument();
      expect(renderResult.queryByText(/No agent policies/)).not.toBeInTheDocument();
    });
  });

  describe('Uninstall command flyout', () => {
    it('should not render "Uninstall agents on this policy" menu item for managed Agent', async () => {
      expect(
        renderResult.queryByTestId('uninstall-agents-command-menu-item')
      ).not.toBeInTheDocument();

      fireEvent.click(renderResult.getAllByTestId('agentActionsBtn')[1]);

      expect(
        renderResult.queryByTestId('uninstall-agents-command-menu-item')
      ).not.toBeInTheDocument();
    });

    it('should render "Uninstall agents on this policy" menu item for not managed Agent', async () => {
      expect(
        renderResult.queryByTestId('uninstall-agents-command-menu-item')
      ).not.toBeInTheDocument();

      fireEvent.click(renderResult.getAllByTestId('agentActionsBtn')[0]);

      expect(renderResult.queryByTestId('uninstall-agents-command-menu-item')).toBeInTheDocument();
    });

    it('should open uninstall commands flyout when clicking on "Uninstall agents on this policy"', () => {
      fireEvent.click(renderResult.getAllByTestId('agentActionsBtn')[0]);
      expect(renderResult.queryByTestId('uninstall-command-flyout')).not.toBeInTheDocument();

      fireEvent.click(renderResult.getByTestId('uninstall-agents-command-menu-item'));

      expect(renderResult.queryByTestId('uninstall-command-flyout')).toBeInTheDocument();
    });
  });
});
