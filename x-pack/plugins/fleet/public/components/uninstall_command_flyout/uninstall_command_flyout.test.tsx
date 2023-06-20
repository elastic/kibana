/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { UseRequestResponse } from '@kbn/es-ui-shared-plugin/public';

import type { GetUninstallTokensResponse } from '../../../common/types/rest_spec/uninstall_token';

import { createFleetTestRendererMock } from '../../mock';

import { useGetUninstallTokens } from '../../hooks/use_request/uninstall_tokens';

import type { RequestError } from '../../hooks';

import type { UninstallCommandFlyoutProps } from './uninstall_command_flyout';
import { UninstallCommandFlyout } from './uninstall_command_flyout';

jest.mock('../../hooks/use_request/uninstall_tokens', () => ({
  useGetUninstallTokens: jest.fn(),
}));

type MockReturnType = Partial<UseRequestResponse<GetUninstallTokensResponse, RequestError>>;

describe('UninstallCommandFlyout', () => {
  const useGetUninstallTokensMock = useGetUninstallTokens as jest.Mock;

  const render = (props: Partial<UninstallCommandFlyoutProps> = {}) => {
    const renderer = createFleetTestRendererMock();

    return renderer.render(
      <UninstallCommandFlyout onClose={() => {}} target="agent" policyId="policy_id" {...props} />
    );
  };

  beforeEach(() => {
    const response: GetUninstallTokensResponse = {
      items: [{ policy_id: 'policy_id', token: '123456789' }],
      total: 1,
      page: 1,
      perPage: 20,
    };

    const mockReturn: MockReturnType = {
      isLoading: false,
      error: null,
      data: response,
    };

    useGetUninstallTokensMock.mockReturnValue(mockReturn);
  });

  describe('uninstall command targets', () => {
    it('renders flyout for Agent', () => {
      const renderResult = render({ target: 'agent' });

      expect(renderResult.queryByText(/Uninstall Elastic Agent on your host/)).toBeInTheDocument();
      expect(renderResult.queryByText(/Uninstall Elastic Defend/)).not.toBeInTheDocument();
    });

    it('renders flyout for Endpoint integration', () => {
      const renderResult = render({ target: 'endpoint' });

      expect(renderResult.queryByText(/Uninstall Elastic Defend/)).toBeInTheDocument();
      expect(
        renderResult.queryByText(/Uninstall Elastic Agent on your host/)
      ).not.toBeInTheDocument();
    });
  });

  describe('when fetching the tokens is successful', () => {
    it('shows loading spinner while fetching', () => {
      const mockReturn: MockReturnType = {
        isLoading: true,
        error: null,
        data: null,
      };
      useGetUninstallTokensMock.mockReturnValue(mockReturn);

      const renderResult = render();

      expect(renderResult.queryByTestId('loadingSpinner')).toBeInTheDocument();
      expect(
        renderResult.queryByTestId('uninstall-commands-flyout-code-block')
      ).not.toBeInTheDocument();
    });

    it('renders buttons for Linux/Mac and for Windows', () => {
      const renderResult = render();

      expect(renderResult.queryByTestId('loadingSpinner')).not.toBeInTheDocument();
      const platformsButtonGroup = renderResult.getByTestId(
        'uninstall-commands-flyout-platforms-btn-group'
      );
      expect(platformsButtonGroup).toHaveTextContent('Linux or Mac');
      expect(platformsButtonGroup).toHaveTextContent('Windows');
    });

    it('renders commands for Linux/Mac on default', () => {
      const renderResult = render();

      const uninstallInstructions = renderResult.getByTestId(
        'uninstall-commands-flyout-code-block'
      );
      expect(uninstallInstructions).toHaveTextContent(
        'sudo elastic-agent uninstall --uninstall-token 123456789'
      );
    });

    it('when user selects Windows, it renders commands for Windows', () => {
      const renderResult = render();

      renderResult.getByTestId('windows').click();

      const uninstallInstructions = renderResult.getByTestId(
        'uninstall-commands-flyout-code-block'
      );
      expect(uninstallInstructions).toHaveTextContent(
        'C:\\"Program Files"\\Elastic\\Agent\\elastic-agent.exe uninstall --uninstall-token 123456789'
      );
    });

    it('displays the selected policy id to the user', () => {
      const renderResult = render();

      const policyIdHint = renderResult.getByTestId('uninstall-command-flyout-policy-id-hint');
      expect(policyIdHint.textContent).toBe('Valid for the following agent policy: policy_id');
    });
  });

  describe('when fetching the tokens is unsuccessful', () => {
    it('shows error message when fetching returns an error', () => {
      const mockReturn: MockReturnType = {
        isLoading: false,
        error: new Error('received error message'),
        data: null,
      };
      useGetUninstallTokensMock.mockReturnValue(mockReturn);

      const renderResult = render();

      expect(renderResult.queryByTestId('loadingSpinner')).not.toBeInTheDocument();

      expect(renderResult.queryByText(/Unable to fetch uninstall token/)).toBeInTheDocument();
      expect(renderResult.queryByText(/received error message/)).toBeInTheDocument();
    });

    it('shows "Unknown error" error message when token is missing from response', () => {
      const mockReturn: MockReturnType = {
        isLoading: false,
        error: null,
        data: null,
      };
      useGetUninstallTokensMock.mockReturnValue(mockReturn);

      const renderResult = render();

      expect(renderResult.queryByTestId('loadingSpinner')).not.toBeInTheDocument();

      expect(renderResult.queryByText(/Unable to fetch uninstall token/)).toBeInTheDocument();
      expect(renderResult.queryByText(/Unknown error/)).toBeInTheDocument();
    });
  });
});
