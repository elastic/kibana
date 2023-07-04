/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UseRequestResponse } from '@kbn/es-ui-shared-plugin/public';

import type { GetUninstallTokensMetadataResponse } from '../../../../../../common/types/rest_spec/uninstall_token';
import type { RequestError } from '../../../../../hooks';
import { createFleetTestRendererMock } from '../../../../../mock';
import { useGetUninstallTokens } from '../../../../../hooks/use_request/uninstall_tokens';
import type { UninstallTokenMetadata } from '../../../../../../common/types/models/uninstall_token';

import { UninstallTokenListPage } from '.';

jest.mock('../../../../../hooks/use_request/uninstall_tokens', () => ({
  useGetUninstallTokens: jest.fn(),
}));

type MockResponseType<DataType> = Pick<
  UseRequestResponse<DataType, RequestError>,
  'data' | 'error' | 'isLoading'
>;

describe('UninstallTokenList page', () => {
  const render = () => {
    const renderer = createFleetTestRendererMock();

    return renderer.render(<UninstallTokenListPage />);
  };

  const useGetUninstallTokensMock = useGetUninstallTokens as jest.Mock;

  describe('when loading tokens', () => {
    it('should show loading message', () => {
      const getTokensResponseFixture: MockResponseType<GetUninstallTokensMetadataResponse> = {
        isLoading: true,
        error: null,
      };
      useGetUninstallTokensMock.mockReturnValue(getTokensResponseFixture);

      const renderResult = render();

      expect(renderResult.queryByTestId('uninstallTokenListTable')).toBeInTheDocument();
      expect(renderResult.queryByText('Loading uninstall tokens...')).toBeInTheDocument();
    });
  });

  describe('when there are no uninstall tokens', () => {
    it('should show message when no tokens found', () => {
      const getTokensResponseFixture: MockResponseType<GetUninstallTokensMetadataResponse> = {
        isLoading: false,
        error: null,
        data: { items: [], total: 0, page: 1, perPage: 20 },
      };
      useGetUninstallTokensMock.mockReturnValue(getTokensResponseFixture);

      const renderResult = render();

      expect(renderResult.queryByTestId('uninstallTokenListTable')).toBeInTheDocument();
      expect(renderResult.queryByText('No uninstall tokens found.')).toBeInTheDocument();
    });
  });

  describe('when there are tokens', () => {
    beforeEach(() => {
      const uninstallTokenMetadataFixture: UninstallTokenMetadata = {
        id: 'id-1',
        policy_id: 'policy-id-1',
        created_at: '2023-06-19T08:47:31.457Z',
      };

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
    });

    it('should render table with one token', () => {
      const renderResult = render();

      expect(renderResult.queryByTestId('uninstallTokenListTable')).toBeInTheDocument();
      expect(renderResult.queryByText('policy-id-1')).toBeInTheDocument();
    });
  });
});
