/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, act, waitFor } from '@testing-library/react';

import type { TestRenderer } from '../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../mock';

import {
  useUIExtension,
  sendGetOneAgentPolicy,
  sendGetOnePackagePolicy,
  sendUpgradePackagePolicyDryRun,
} from '../../../hooks';
import { useGetOnePackagePolicy } from '../../../../integrations/hooks';

import { EditPackagePolicyPage } from '.';

jest.mock('../../../hooks', () => {
  return {
    ...jest.requireActual('../../../hooks'),
    sendGetAgentStatus: jest.fn().mockResolvedValue({ data: { results: { total: 0 } } }),
    sendUpdatePackagePolicy: jest.fn(),
    sendGetOnePackagePolicy: jest.fn(),
    sendGetOneAgentPolicy: jest.fn(),
    sendUpgradePackagePolicyDryRun: jest.fn(),
    sendGetPackageInfoByKey: jest.fn().mockImplementation((name, version) =>
      Promise.resolve({
        data: {
          item: {
            name,
            title: 'Nginx',
            version,
            release: 'ga',
            description: 'Collect logs and metrics from Nginx HTTP servers with Elastic Agent.',
            policy_templates: [
              {
                name: 'nginx',
                title: 'Nginx logs and metrics',
                description: 'Collect logs and metrics from Nginx instances',
                inputs: [
                  {
                    type: 'logfile',
                    title: 'Collect logs from Nginx instances',
                    description: 'Collecting Nginx access and error logs',
                  },
                ],
                multiple: true,
              },
            ],
            data_streams: [
              {
                type: 'logs',
                dataset: 'nginx.access',
                title: 'Nginx access logs',
                release: 'experimental',
                ingest_pipeline: 'default',
                streams: [
                  {
                    input: 'logfile',
                    vars: [
                      {
                        name: 'paths',
                        type: 'text',
                        title: 'Paths',
                        multi: true,
                        required: true,
                        show_user: true,
                        default: ['/var/log/nginx/access.log*'],
                      },
                    ],
                    template_path: 'stream.yml.hbs',
                    title: 'Nginx access logs',
                    description: 'Collect Nginx access logs',
                    enabled: true,
                  },
                ],
                package: 'nginx',
                path: 'access',
              },
            ],
            latestVersion: version,
            removable: true,
            keepPoliciesUpToDate: false,
            status: 'not_installed',
          },
        },
        isLoading: false,
      })
    ),
    useUIExtension: jest.fn(),
  };
});

jest.mock('../../../../integrations/hooks', () => {
  return {
    ...jest.requireActual('../../../../integrations/hooks'),
    useGetOnePackagePolicy: jest.fn(),
  };
});

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useRouteMatch: jest.fn().mockReturnValue({
    params: {
      packagePolicyId: 'nginx-1',
    },
  }),
}));

const mockPackagePolicy = {
  id: 'nginx-1',
  name: 'nginx-1',
  namespace: 'default',
  description: 'Nginx description',
  package: { name: 'nginx', title: 'Nginx', version: '1.3.0' },
  enabled: true,
  policy_id: 'agent-policy-1',
  output_id: '',
  inputs: [
    {
      type: 'logfile',
      policy_template: 'nginx',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: { type: 'logs', dataset: 'nginx.access' },
          vars: {
            paths: { value: ['/var/log/nginx/access.log*'], type: 'text' },
          },
        },
      ],
    },
  ],
};

const mockPackagePolicyNewVersion = {
  ...mockPackagePolicy,
  package: { name: 'nginx', title: 'Nginx', version: '1.4.0' },
};

const TestComponent = async () => {
  return {
    default: () => {
      return <div />;
    },
  };
};

describe('edit package policy page', () => {
  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const render = () => (renderResult = testRenderer.render(<EditPackagePolicyPage />));

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();

    (useGetOnePackagePolicy as jest.MockedFunction<any>).mockReturnValue({
      data: {
        item: mockPackagePolicy,
      },
    });
    (sendGetOnePackagePolicy as jest.MockedFunction<any>).mockResolvedValue({
      data: {
        item: mockPackagePolicy,
      },
    });
    (sendGetOneAgentPolicy as jest.MockedFunction<any>).mockResolvedValue({
      data: { item: { id: 'agent-policy-1', name: 'Agent policy 1', namespace: 'default' } },
    });
  });

  it('should disable submit button on invalid form with empty package var', async () => {
    (sendUpgradePackagePolicyDryRun as jest.MockedFunction<any>).mockResolvedValue({
      data: [
        {
          diff: [mockPackagePolicy, mockPackagePolicy],
        },
      ],
    });
    render();

    await waitFor(() => {
      expect(renderResult.getByText('Collect logs from Nginx instances')).toBeInTheDocument();
      expect(renderResult.getByDisplayValue('nginx-1')).toBeInTheDocument();
      expect(renderResult.getByDisplayValue('Nginx description')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(renderResult.getByLabelText('Show logfile inputs'));
    });

    await act(async () => {
      fireEvent.change(renderResult.getByDisplayValue('/var/log/nginx/access.log*'), {
        target: { value: '' },
      });
    });

    expect(
      renderResult.getByText('Your integration policy has errors. Please fix them before saving.')
    ).toBeInTheDocument();
    expect(renderResult.getByText(/Save integration/).closest('button')!).toBeDisabled();
  });

  it('should show ready for upgrade if package useLatestPackageVersion and no conflicts', async () => {
    (useUIExtension as jest.MockedFunction<any>).mockReturnValue({
      useLatestPackageVersion: true,
      Component: TestComponent,
    });
    (sendUpgradePackagePolicyDryRun as jest.MockedFunction<any>).mockResolvedValue({
      data: [
        {
          diff: [mockPackagePolicy, mockPackagePolicyNewVersion],
        },
      ],
    });

    render();

    await waitFor(() => {
      expect(renderResult.getByText(/Upgrade integration/).closest('button')!).not.toBeDisabled();
      expect(
        renderResult.getByText(
          'This integration is ready to be upgraded from version 1.3.0 to 1.4.0. Review the changes below and save to upgrade.'
        )
      ).toBeInTheDocument();
    });
  });

  it('should show review field conflicts if package useLatestPackageVersion and has conflicts', async () => {
    (useUIExtension as jest.MockedFunction<any>).mockReturnValue({
      useLatestPackageVersion: true,
      Component: TestComponent,
    });
    (sendUpgradePackagePolicyDryRun as jest.MockedFunction<any>).mockResolvedValue({
      data: [
        {
          hasErrors: true,
          diff: [mockPackagePolicy, mockPackagePolicyNewVersion],
        },
      ],
    });

    render();

    await waitFor(() => {
      expect(renderResult.getByText('Review field conflicts')).toBeInTheDocument();
    });
  });
});
