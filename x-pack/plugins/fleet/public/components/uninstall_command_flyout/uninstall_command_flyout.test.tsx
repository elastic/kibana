/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { UseRequestResponse } from '@kbn/es-ui-shared-plugin/public';

import type {
  UninstallToken,
  UninstallTokenMetadata,
} from '../../../common/types/models/uninstall_token';

import type {
  GetUninstallTokensMetadataResponse,
  GetUninstallTokenResponse,
} from '../../../common/types/rest_spec/uninstall_token';

import type { TestRenderer } from '../../mock';
import { createFleetTestRendererMock } from '../../mock';

import {
  useGetUninstallTokens,
  useGetUninstallToken,
} from '../../hooks/use_request/uninstall_tokens';

import type { RequestError } from '../../hooks';

import { UninstallCommandFlyout } from './uninstall_command_flyout';
import type { UninstallCommandTarget } from './types';

jest.mock('../../hooks/use_request/uninstall_tokens', () => ({
  useGetUninstallToken: jest.fn(),
  useGetUninstallTokens: jest.fn(),
}));

type MockResponseType<DataType> = Pick<
  UseRequestResponse<DataType, RequestError>,
  'data' | 'error' | 'isLoading'
>;

describe('UninstallCommandFlyout', () => {
  const uninstallTokenMetadataFixture: UninstallTokenMetadata = {
    id: 'id-1',
    policy_id: 'policy_id',
    policy_name: 'policy_name',
    created_at: '2023-06-19T08:47:31.457Z',
  };

  const uninstallTokenFixture: UninstallToken = {
    ...uninstallTokenMetadataFixture,
    token: '123456789',
  };

  const useGetUninstallTokensMock = useGetUninstallTokens as jest.Mock;
  const useGetUninstallTokenMock = useGetUninstallToken as jest.Mock;

  let renderer: TestRenderer;

  const render = () =>
    renderer.render(
      <UninstallCommandFlyout onClose={() => {}} policyId="policy_id" target="agent" />
    );

  const renderForTarget = (target: UninstallCommandTarget) =>
    renderer.render(
      <UninstallCommandFlyout onClose={() => {}} policyId="policy_id" target={target} />
    );

  beforeEach(() => {
    renderer = createFleetTestRendererMock();

    const getTokensResponseFixture: MockResponseType<GetUninstallTokensMetadataResponse> = {
      isLoading: false,
      error: null,
      data: {
        items: [uninstallTokenMetadataFixture],
        total: 1,
        page: 1,
        perPage: 20,
      },
    };
    useGetUninstallTokensMock.mockReturnValue(getTokensResponseFixture);

    const getTokenResponseFixture: MockResponseType<GetUninstallTokenResponse> = {
      isLoading: false,
      error: null,
      data: {
        item: uninstallTokenFixture,
      },
    };
    useGetUninstallTokenMock.mockReturnValue(getTokenResponseFixture);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uninstall command targets', () => {
    it('renders flyout for Agent', () => {
      const renderResult = renderForTarget('agent');

      expect(renderResult.queryByText(/Uninstall Elastic Agent on your host/)).toBeInTheDocument();
      expect(renderResult.queryByText(/Uninstall Elastic Defend/)).not.toBeInTheDocument();
    });

    it('renders flyout for Endpoint integration', () => {
      const renderResult = renderForTarget('endpoint');

      expect(renderResult.queryByText(/Uninstall Elastic Defend/)).toBeInTheDocument();
      expect(
        renderResult.queryByText(/Uninstall Elastic Agent on your host/)
      ).not.toBeInTheDocument();
    });
  });

  describe('when fetching the token is successful', () => {
    it('shows loading spinner while fetching', () => {
      const mockReturn: MockResponseType<GetUninstallTokensMetadataResponse> = {
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

    it('displays the selected policy id and policy name to the user', () => {
      const renderResult = render();

      const policyIdHint = renderResult.getByTestId('uninstall-command-flyout-policy-id-hint');
      expect(policyIdHint.textContent).toBe(
        'Valid for the following agent policy:policy_name (policy_id)'
      );
    });

    it('displays hint if policy name is missing', () => {
      const getTokenResponseFixture: MockResponseType<GetUninstallTokenResponse> = {
        isLoading: false,
        error: null,
        data: {
          item: { ...uninstallTokenFixture, policy_name: null },
        },
      };
      useGetUninstallTokenMock.mockReturnValue(getTokenResponseFixture);

      const renderResult = render();

      const policyIdHint = renderResult.getByTestId('uninstall-command-flyout-policy-id-hint');
      expect(policyIdHint.textContent).toBe(
        "Valid for the following agent policy:- This token's related Agent policy has already been deleted, so the policy name is unavailable. (policy_id)"
      );
      expect(renderResult.getByTestId('emptyPolicyNameHint')).toBeInTheDocument();
    });
  });

  describe('when fetching the token metadata is unsuccessful', () => {
    it('shows error message when fetching returns an error', () => {
      const mockReturn: MockResponseType<GetUninstallTokensMetadataResponse> = {
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
      const mockReturn: MockResponseType<GetUninstallTokensMetadataResponse> = {
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

  describe('when fetching the decrypted token is unsuccessful', () => {
    it('shows error message when fetching returns an error', () => {
      const mockReturn: MockResponseType<GetUninstallTokenResponse> = {
        isLoading: false,
        error: new Error('received error message'),
        data: null,
      };
      useGetUninstallTokenMock.mockReturnValue(mockReturn);

      const renderResult = render();

      expect(renderResult.queryByTestId('loadingSpinner')).not.toBeInTheDocument();

      expect(renderResult.queryByText(/Unable to fetch uninstall token/)).toBeInTheDocument();
      expect(renderResult.queryByText(/received error message/)).toBeInTheDocument();
    });

    it('shows "Unknown error" error message when token is missing from response', () => {
      const mockReturn: MockResponseType<GetUninstallTokenResponse> = {
        isLoading: false,
        error: null,
        data: null,
      };
      useGetUninstallTokenMock.mockReturnValue(mockReturn);

      const renderResult = render();

      expect(renderResult.queryByTestId('loadingSpinner')).not.toBeInTheDocument();

      expect(renderResult.queryByText(/Unable to fetch uninstall token/)).toBeInTheDocument();
      expect(renderResult.queryByText(/Unknown error/)).toBeInTheDocument();
    });
  });

  describe('when using either with `policyId` or `uninstallTokenId`', () => {
    it('should perform 2 fetches when using with `policyId`', () => {
      renderer.render(
        <UninstallCommandFlyout onClose={() => {}} policyId="policy_id" target="agent" />
      );

      expect(useGetUninstallTokensMock).toHaveBeenCalled();
      expect(useGetUninstallTokenMock).toHaveBeenCalled();
    });

    it('should perform only 1 fetch when providing `uninstallTokenId`', () => {
      renderer.render(
        <UninstallCommandFlyout
          onClose={() => {}}
          uninstallTokenId="theProvidedTokenId"
          target="agent"
        />
      );

      expect(useGetUninstallTokensMock).not.toHaveBeenCalled();
      expect(useGetUninstallTokenMock).toHaveBeenCalledWith('theProvidedTokenId');
    });
  });
});
