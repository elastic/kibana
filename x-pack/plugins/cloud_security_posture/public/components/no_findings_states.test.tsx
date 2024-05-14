/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { createReactQueryResponse } from '../test/fixtures/react_query';
import { TestProvider } from '../test/test_provider';
import { NoFindingsStates } from './no_findings_states';
import { useCspSetupStatusApi } from '../common/api/use_setup_status_api';
import { useCspIntegrationLink } from '../common/navigation/use_csp_integration_link';
import { useLicenseManagementLocatorApi } from '../common/api/use_license_management_locator_api';
import { useSubscriptionStatus } from '../common/hooks/use_subscription_status';

jest.mock('../common/api/use_setup_status_api', () => ({
  useCspSetupStatusApi: jest.fn(),
}));

jest.mock('../common/navigation/use_csp_integration_link', () => ({
  useCspIntegrationLink: jest.fn(),
}));

jest.mock('../common/api/use_license_management_locator_api', () => ({
  useLicenseManagementLocatorApi: jest.fn(),
}));

jest.mock('../common/hooks/use_subscription_status', () => ({
  useSubscriptionStatus: jest.fn(),
}));

const customRederer = (postureType: 'cspm' | 'kspm') => {
  return render(
    <TestProvider>
      <NoFindingsStates postureType={postureType} />
    </TestProvider>
  );
};

describe('NoFindingsStates', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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

    (useCspIntegrationLink as jest.Mock).mockReturnValue('http://cspm-or-kspm-integration-link');
  });

  it('should show the indexing notification when CSPM is not installed and KSPM is indexing', async () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          cspm: {
            status: 'not-deployed',
          },
          kspm: {
            status: 'indexing',
          },
          indicesDetails: [
            { index: 'logs-cloud_security_posture.findings_latest-default', status: 'empty' },
            { index: 'logs-cloud_security_posture.findings-default*', status: 'empty' },
          ],
        },
      })
    );

    const { getByText } = customRederer('kspm');
    expect(getByText(/posture evaluation underway/i)).toBeInTheDocument();
    expect(
      getByText(
        /waiting for data to be collected and indexed. check back later to see your findings/i
      )
    ).toBeInTheDocument();
  });

  it('should show the indexing notification when KSPM is not installed and CSPM is indexing', async () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          kspm: {
            status: 'not-deployed',
          },
          cspm: {
            status: 'indexing',
          },
          indicesDetails: [
            { index: 'logs-cloud_security_posture.findings_latest-default', status: 'empty' },
            { index: 'logs-cloud_security_posture.findings-default*', status: 'empty' },
          ],
        },
      })
    );

    const { getByText } = customRederer('cspm');
    expect(getByText(/posture evaluation underway/i)).toBeInTheDocument();
    expect(
      getByText(
        /waiting for data to be collected and indexed. Check back later to see your findings/i
      )
    ).toBeInTheDocument();
  });

  it('should show the indexing timout notification when CSPM is status is index-timeout', async () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          kspm: {
            status: 'installed',
          },
          cspm: {
            status: 'index-timeout',
          },
          indicesDetails: [
            { index: 'logs-cloud_security_posture.findings_latest-default', status: 'empty' },
            { index: 'logs-cloud_security_posture.findings-default*', status: 'empty' },
          ],
        },
      })
    );

    const { getByText } = customRederer('cspm');
    expect(getByText(/waiting for findings data/i)).toBeInTheDocument();
    const indexTimeOutMessage = getByText(/collecting findings is taking longer than expected/i);
    expect(indexTimeOutMessage).toBeInTheDocument();
  });

  it('should show the indexing timout notification when KSPM is status is index-timeout', async () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          kspm: {
            status: 'index-timeout',
          },
          cspm: {
            status: 'installed',
          },
          indicesDetails: [
            { index: 'logs-cloud_security_posture.findings_latest-default', status: 'empty' },
            { index: 'logs-cloud_security_posture.findings-default*', status: 'empty' },
          ],
        },
      })
    );

    const { getByText } = customRederer('kspm');
    expect(getByText(/waiting for findings data/i)).toBeInTheDocument();
    expect(getByText(/collecting findings is taking longer than expected/i)).toBeInTheDocument();
  });

  it('should show the unprivileged notification when CSPM is status is index-timeout', async () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          kspm: {
            status: 'installed',
          },
          cspm: {
            status: 'unprivileged',
          },
          indicesDetails: [
            {
              index: 'logs-cloud_security_posture.findings_latest-default',
              status: 'unprivileged',
            },
            { index: 'logs-cloud_security_posture.findings-default*', status: 'unprivileged' },
          ],
        },
      })
    );

    const { getByText } = customRederer('cspm');
    expect(getByText(/privileges required/i)).toBeInTheDocument();
  });

  it('should show the unprivileged notification when KSPM is status is index-timeout', async () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          kspm: {
            status: 'unprivileged',
          },
          cspm: {
            status: 'installed',
          },
          indicesDetails: [
            {
              index: 'logs-cloud_security_posture.findings_latest-default',
              status: 'unprivileged',
            },
            { index: 'logs-cloud_security_posture.findings-default*', status: 'unprivileged' },
          ],
        },
      })
    );

    const { getByText } = customRederer('kspm');
    expect(getByText(/privileges required/i)).toBeInTheDocument();
  });

  it('should show the not-installed notification when CSPM and KSPM status is not-installed', async () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          kspm: {
            status: 'not-installed',
          },
          cspm: {
            status: 'not-installed',
          },
          indicesDetails: [
            {
              index: 'logs-cloud_security_posture.findings_latest-default',
              status: 'success',
            },
            { index: 'logs-cloud_security_posture.findings-default*', status: 'success' },
          ],
        },
      })
    );

    const { getByText } = customRederer('cspm');
    expect(getByText(/learn more about cloud security posture/i)).toBeInTheDocument();
  });
});
