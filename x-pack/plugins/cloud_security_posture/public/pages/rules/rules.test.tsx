/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import Chance from 'chance';
import { Rules } from '.';
import { render, screen } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { TestProvider } from '../../test/test_provider';
import { useCspIntegrationInfo } from './use_csp_integration';
import { type RouteComponentProps } from 'react-router-dom';
import type { PageUrlParams, PageUrlParamsVersion2 } from './rules_container';
import * as TEST_SUBJECTS from './test_subjects';
import { createReactQueryResponse } from '../../test/fixtures/react_query';
import { coreMock } from '@kbn/core/public/mocks';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { useSubscriptionStatus } from '../../common/hooks/use_subscription_status';
import { useCspIntegrationLink } from '../../common/navigation/use_csp_integration_link';
import { useLicenseManagementLocatorApi } from '../../common/api/use_license_management_locator_api';
import { useFindCspRuleTemplates } from './use_csp_rules';

jest.mock('./use_csp_integration', () => ({
  useCspIntegrationInfo: jest.fn(),
}));
jest.mock('./use_csp_rules', () => ({
  useFindCspRuleTemplates: jest.fn(),
}));
jest.mock('../../common/api/use_setup_status_api');
jest.mock('../../common/api/use_license_management_locator_api');
jest.mock('../../common/hooks/use_subscription_status');
jest.mock('../../common/navigation/use_csp_integration_link');

const chance = new Chance();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const getTestComponent =
  (params: PageUrlParamsVersion2): React.FC =>
  () => {
    const coreStart = coreMock.createStart();
    const core = {
      ...coreStart,
      application: {
        ...coreStart.application,
        capabilities: {
          ...coreStart.application.capabilities,
          siem: { crud: true },
        },
      },
    };
    return (
      <TestProvider core={core}>
        <Rules
          {...({
            match: { params },
          } as RouteComponentProps<PageUrlParamsVersion2>)}
        />
      </TestProvider>
    );
  };

describe('<Rules />', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          cspm: { status: 'indexed' },
          kspm: { status: 'indexed' },
          indicesDetails: [
            { index: 'logs-cloud_security_posture.findings_latest-default', status: 'not-empty' },
            { index: 'logs-cloud_security_posture.findings-default*', status: 'not-empty' },
          ],
        },
      })
    );

    (useSubscriptionStatus as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: true,
      })
    );

    (useLicenseManagementLocatorApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: true,
      })
    );

    (useCspIntegrationLink as jest.Mock).mockImplementation(() => chance.url());
  });

  it('calls API with URL params', async () => {
    const benchmarkId = 'cis_eks';
    const benchmarkVersion = '2.0.0';
    const params = { benchmarkId: 'cis_eks', benchmarkVersion: '2.0.0' };
    const Component = getTestComponent(params);
    const result = createReactQueryResponse({
      status: 'loading',
    });

    (useFindCspRuleTemplates as jest.Mock).mockReturnValue(result);

    render(<Component />);

    expect(useFindCspRuleTemplates).toHaveBeenCalledWith(
      {
        page: 1,
        perPage: 10000,
      },
      benchmarkId,
      benchmarkVersion
    );
  });

  it('displays success state when result request is resolved', async () => {
    const params = { benchmarkId: 'cis_eks', benchmarkVersion: '2.0.0' };
    const Component = getTestComponent(params);
    const response = createReactQueryResponse({
      status: 'success',
      data: {
        items: [],
        page: 1,
        perPage: 10000,
        total: 1,
      },
    });

    (useFindCspRuleTemplates as jest.Mock).mockReturnValue(response);

    render(<Component />);

    expect(await screen.findByTestId(TEST_SUBJECTS.CSP_RULES_CONTAINER)).toBeInTheDocument();
  });
});
