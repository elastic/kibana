/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseQueryResult } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import React from 'react';
import { IntegrationsGuard } from '.';
import { TestProvidersComponent } from '../../common/mocks/test_providers';
import {
  Integration,
  useIntegrations,
  useIntegrationsPageLink,
  useTIDocumentationLink,
} from '../../hooks';
import { useIndicatorsTotalCount } from '../../modules/indicators';
import { INSTALLATION_STATUS, THREAT_INTELLIGENCE_CATEGORY } from '../../utils';

jest.mock('../../modules/indicators/hooks/use_total_count');
jest.mock('../../hooks/use_integrations_page_link');
jest.mock('../../hooks/use_documentation_link');
jest.mock('../../hooks/use_integrations');

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

    const { asFragment } = render(<IntegrationsGuard>should be restricted</IntegrationsGuard>, {
      wrapper: TestProvidersComponent,
    });

    expect(asFragment()).toMatchSnapshot();
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

    const { asFragment } = render(<IntegrationsGuard>should be restricted</IntegrationsGuard>, {
      wrapper: TestProvidersComponent,
    });

    expect(asFragment()).toMatchSnapshot();
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

    const { asFragment } = render(<IntegrationsGuard>should be restricted</IntegrationsGuard>, {
      wrapper: TestProvidersComponent,
    });

    expect(asFragment()).toMatchSnapshot();
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

    const { asFragment } = render(<IntegrationsGuard>should be restricted</IntegrationsGuard>, {
      wrapper: TestProvidersComponent,
    });
    expect(asFragment()).toMatchSnapshot();
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
    expect(asFragment()).toMatchSnapshot();
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
    expect(asFragment()).toMatchSnapshot();
  });
});
