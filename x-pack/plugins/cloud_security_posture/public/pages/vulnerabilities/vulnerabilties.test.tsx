/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import Chance from 'chance';
import { CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX } from '@kbn/cloud-security-posture-common';
import { Vulnerabilities } from './vulnerabilities';
import {
  CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
  VULN_MGMT_POLICY_TEMPLATE,
} from '../../../common/constants';
import { useCspSetupStatusApi } from '@kbn/cloud-security-posture/src/hooks/use_csp_setup_status_api';
import { useDataView } from '@kbn/cloud-security-posture/src/hooks/use_data_view';
import { createReactQueryResponse } from '../../test/fixtures/react_query';
import { useCISIntegrationPoliciesLink } from '../../common/navigation/use_navigate_to_cis_integration_policies';
import { useCspIntegrationLink } from '../../common/navigation/use_csp_integration_link';
import {
  NO_VULNERABILITIES_STATUS_TEST_SUBJ,
  VULNERABILITIES_CONTAINER_TEST_SUBJ,
} from '../../components/test_subjects';
import { render, screen } from '@testing-library/react';
import { expectIdsInDoc } from '../../test/utils';
import { TestProvider } from '../../test/test_provider';
import { useLicenseManagementLocatorApi } from '../../common/api/use_license_management_locator_api';
import { createStubDataView } from '@kbn/data-views-plugin/common/stubs';
import { VULNERABILITIES_PAGE } from './test_subjects';

jest.mock('@kbn/cloud-security-posture/src/hooks/use_data_view');
jest.mock('@kbn/cloud-security-posture/src/hooks/use_csp_setup_status_api');
jest.mock('../../common/api/use_license_management_locator_api');
jest.mock('../../common/hooks/use_is_subscription_status_valid');
jest.mock('../../common/navigation/use_navigate_to_cis_integration_policies');
jest.mock('../../common/navigation/use_csp_integration_link');

const chance = new Chance();

beforeEach(() => {
  jest.restoreAllMocks();

  (useLicenseManagementLocatorApi as jest.Mock).mockImplementation(() =>
    createReactQueryResponse({
      status: 'success',
      data: true,
    })
  );

  (useDataView as jest.Mock).mockReturnValue({
    status: 'success',
    data: createStubDataView({
      spec: {
        id: CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
      },
    }),
  });
});

const renderVulnerabilitiesPage = () => {
  render(
    <TestProvider>
      <Vulnerabilities />
    </TestProvider>
  );
};

describe('<Vulnerabilities />', () => {
  it('No vulnerabilities  state: not-deployed - shows NotDeployed instead of vulnerabilities ', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          [VULN_MGMT_POLICY_TEMPLATE]: { status: 'not-deployed' },
          indicesDetails: [
            { index: CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN, status: 'empty' },
          ],
        },
      })
    );
    (useCISIntegrationPoliciesLink as jest.Mock).mockImplementation(() => chance.url());
    (useCspIntegrationLink as jest.Mock).mockImplementation(() => chance.url());

    renderVulnerabilitiesPage();

    expectIdsInDoc({
      be: [NO_VULNERABILITIES_STATUS_TEST_SUBJ.NOT_DEPLOYED],
      notToBe: [
        VULNERABILITIES_CONTAINER_TEST_SUBJ,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.NOT_INSTALLED,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.SCANNING_VULNERABILITIES,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.UNPRIVILEGED,
      ],
    });
  });

  it('No vulnerabilities  state: indexing - shows Indexing instead of vulnerabilities ', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          [VULN_MGMT_POLICY_TEMPLATE]: { status: 'indexing' },
          indicesDetails: [
            { index: CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN, status: 'empty' },
          ],
        },
      })
    );
    (useCspIntegrationLink as jest.Mock).mockImplementation(() => chance.url());

    renderVulnerabilitiesPage();

    expectIdsInDoc({
      be: [NO_VULNERABILITIES_STATUS_TEST_SUBJ.SCANNING_VULNERABILITIES],
      notToBe: [
        VULNERABILITIES_CONTAINER_TEST_SUBJ,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.NOT_INSTALLED,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.UNPRIVILEGED,
      ],
    });
  });

  it('No vulnerabilities  state: index-timeout - shows IndexTimeout instead of vulnerabilities ', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          [VULN_MGMT_POLICY_TEMPLATE]: { status: 'index-timeout' },
          indicesDetails: [
            { index: CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN, status: 'empty' },
          ],
        },
      })
    );
    (useCspIntegrationLink as jest.Mock).mockImplementation(() => chance.url());
    renderVulnerabilitiesPage();

    expectIdsInDoc({
      be: [NO_VULNERABILITIES_STATUS_TEST_SUBJ.INDEX_TIMEOUT],
      notToBe: [
        VULNERABILITIES_CONTAINER_TEST_SUBJ,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.SCANNING_VULNERABILITIES,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.UNPRIVILEGED,
      ],
    });
  });

  it('No vulnerabilities  state: unprivileged - shows Unprivileged instead of vulnerabilities ', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          [VULN_MGMT_POLICY_TEMPLATE]: { status: 'unprivileged' },
          indicesDetails: [
            { index: CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN, status: 'empty' },
          ],
        },
      })
    );
    (useCspIntegrationLink as jest.Mock).mockImplementation(() => chance.url());

    renderVulnerabilitiesPage();

    expectIdsInDoc({
      be: [NO_VULNERABILITIES_STATUS_TEST_SUBJ.UNPRIVILEGED],
      notToBe: [
        VULNERABILITIES_CONTAINER_TEST_SUBJ,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.NOT_INSTALLED,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.SCANNING_VULNERABILITIES,
      ],
    });
  });

  it('renders vuln_mgmt integrations installation prompt if vuln_mgmt integration is not installed', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          kspm: { status: 'not-deployed' },
          cspm: { status: 'not-deployed' },
          [VULN_MGMT_POLICY_TEMPLATE]: { status: 'not-installed' },
          indicesDetails: [
            { index: 'logs-cloud_security_posture.findings_latest-default', status: 'empty' },
            { index: 'logs-cloud_security_posture.findings-default*', status: 'empty' },
            { index: CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN, status: 'empty' },
          ],
        },
      })
    );
    (useCspIntegrationLink as jest.Mock).mockImplementation(() => chance.url());

    renderVulnerabilitiesPage();

    expectIdsInDoc({
      be: [NO_VULNERABILITIES_STATUS_TEST_SUBJ.NOT_INSTALLED],
      notToBe: [
        VULNERABILITIES_CONTAINER_TEST_SUBJ,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.SCANNING_VULNERABILITIES,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.UNPRIVILEGED,
      ],
    });
  });

  it('renders Vulnerabilities page when there are findings', async () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          hasVulnerabilitiesFindings: true,
        },
      })
    );

    (useDataView as jest.Mock).mockReturnValue({
      status: 'success',
      data: createStubDataView({
        spec: {
          id: CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
        },
      }),
    });

    renderVulnerabilitiesPage();

    expect(screen.getByTestId(VULNERABILITIES_PAGE)).toBeInTheDocument();
  });
});
