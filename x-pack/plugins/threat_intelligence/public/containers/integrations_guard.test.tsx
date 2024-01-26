/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseQueryResult } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import React from 'react';
import { IntegrationsGuard } from './integrations_guard';
import { TestProvidersComponent } from '../mocks/test_providers';
import { Integration, useIntegrations } from '../hooks/use_integrations';
import { useIntegrationsPageLink } from '../hooks/use_integrations_page_link';
import { useTIDocumentationLink } from '../hooks/use_documentation_link';
import { useIndicatorsTotalCount } from '../modules/indicators/hooks/use_total_count';
import { INSTALLATION_STATUS, THREAT_INTELLIGENCE_CATEGORY } from '../utils/filter_integrations';
import { LOADING_LOGO_TEST_ID } from './test_ids';
import { EMPTY_PROMPT_TEST_ID } from '../modules/empty_page/empty_page';

jest.mock('../modules/indicators/hooks/use_total_count');
jest.mock('../hooks/use_integrations_page_link');
jest.mock('../hooks/use_documentation_link');
jest.mock('../hooks/use_integrations');

describe('IntegrationsGuard', () => {
  it('should render loading when indicator count and integrations are being loaded', async () => {
    (
      useIndicatorsTotalCount as jest.MockedFunction<typeof useIndicatorsTotalCount>
    ).mockReturnValue({
      count: 0,
      isLoading: true,
    });
    (
      useIntegrationsPageLink as jest.MockedFunction<typeof useIntegrationsPageLink>
    ).mockReturnValue('');
    (useTIDocumentationLink as jest.MockedFunction<typeof useTIDocumentationLink>).mockReturnValue(
      ''
    );
    (useIntegrations as jest.MockedFunction<typeof useIntegrations>).mockReturnValue({
      isLoading: true,
      data: [],
    } as unknown as UseQueryResult<Integration[]>);

    const { getByTestId } = render(<IntegrationsGuard>should be restricted</IntegrationsGuard>, {
      wrapper: TestProvidersComponent,
    });

    expect(getByTestId(LOADING_LOGO_TEST_ID)).toBeInTheDocument();
  });

  it('should render loading when indicator only is loading', async () => {
    (
      useIndicatorsTotalCount as jest.MockedFunction<typeof useIndicatorsTotalCount>
    ).mockReturnValue({
      count: 0,
      isLoading: true,
    });
    (
      useIntegrationsPageLink as jest.MockedFunction<typeof useIntegrationsPageLink>
    ).mockReturnValue('');
    (useTIDocumentationLink as jest.MockedFunction<typeof useTIDocumentationLink>).mockReturnValue(
      ''
    );
    (useIntegrations as jest.MockedFunction<typeof useIntegrations>).mockReturnValue({
      isLoading: false,
      data: [],
    } as unknown as UseQueryResult<Integration[]>);

    const { getByTestId } = render(<IntegrationsGuard>should be restricted</IntegrationsGuard>, {
      wrapper: TestProvidersComponent,
    });

    expect(getByTestId(LOADING_LOGO_TEST_ID)).toBeInTheDocument();
  });

  it('should render loading when integrations only are loading', async () => {
    (
      useIndicatorsTotalCount as jest.MockedFunction<typeof useIndicatorsTotalCount>
    ).mockReturnValue({
      count: 0,
      isLoading: true,
    });
    (
      useIntegrationsPageLink as jest.MockedFunction<typeof useIntegrationsPageLink>
    ).mockReturnValue('');
    (useTIDocumentationLink as jest.MockedFunction<typeof useTIDocumentationLink>).mockReturnValue(
      ''
    );
    (useIntegrations as jest.MockedFunction<typeof useIntegrations>).mockReturnValue({
      isLoading: true,
      data: [],
    } as unknown as UseQueryResult<Integration[]>);

    const { getByTestId } = render(<IntegrationsGuard>should be restricted</IntegrationsGuard>, {
      wrapper: TestProvidersComponent,
    });

    expect(getByTestId(LOADING_LOGO_TEST_ID)).toBeInTheDocument();
  });

  it('should render empty page when no indicators are found and no ti integrations are installed', async () => {
    (
      useIndicatorsTotalCount as jest.MockedFunction<typeof useIndicatorsTotalCount>
    ).mockReturnValue({
      count: 0,
      isLoading: false,
    });
    (
      useIntegrationsPageLink as jest.MockedFunction<typeof useIntegrationsPageLink>
    ).mockReturnValue('');
    (useTIDocumentationLink as jest.MockedFunction<typeof useTIDocumentationLink>).mockReturnValue(
      ''
    );
    (useIntegrations as jest.MockedFunction<typeof useIntegrations>).mockReturnValue({
      isLoading: false,
      data: [],
    } as unknown as UseQueryResult<Integration[]>);

    const { getByTestId } = render(<IntegrationsGuard>should be restricted</IntegrationsGuard>, {
      wrapper: TestProvidersComponent,
    });
    expect(getByTestId(EMPTY_PROMPT_TEST_ID)).toBeInTheDocument();
  });

  it('should render indicators table when we have some indicators', async () => {
    (
      useIndicatorsTotalCount as jest.MockedFunction<typeof useIndicatorsTotalCount>
    ).mockReturnValue({
      count: 7,
      isLoading: false,
    });
    (useIntegrations as jest.MockedFunction<typeof useIntegrations>).mockReturnValue({
      isLoading: false,
      data: [],
    } as unknown as UseQueryResult<Integration[]>);

    const { asFragment } = render(<IntegrationsGuard>should be restricted</IntegrationsGuard>, {
      wrapper: TestProvidersComponent,
    });
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        should be restricted
      </DocumentFragment>
    `);
  });

  it('should render indicators page when we have some ti integrations installed', async () => {
    (
      useIndicatorsTotalCount as jest.MockedFunction<typeof useIndicatorsTotalCount>
    ).mockReturnValue({
      count: 0,
      isLoading: false,
    });
    (useIntegrations as jest.MockedFunction<typeof useIntegrations>).mockReturnValue({
      isLoading: false,
      data: [
        {
          categories: [THREAT_INTELLIGENCE_CATEGORY],
          id: '123',
          status: INSTALLATION_STATUS.Installed,
        },
      ],
    } as unknown as UseQueryResult<Integration[]>);

    const { asFragment } = render(<IntegrationsGuard>should be restricted</IntegrationsGuard>, {
      wrapper: TestProvidersComponent,
    });
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        should be restricted
      </DocumentFragment>
    `);
  });
});
