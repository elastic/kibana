/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';

import type { TestRenderer } from '../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../mock';
import type { NewPackagePolicy, PackageInfo } from '../../../types';

import { StepConfigurePackagePolicy } from './step_configure_package';

describe('StepConfigurePackage', () => {
  let packageInfo: PackageInfo;
  let packagePolicy: NewPackagePolicy;
  const mockUpdatePackagePolicy = jest.fn().mockImplementation((val: any) => {
    packagePolicy = {
      ...val,
      ...packagePolicy,
    };
  });

  const validationResults = { name: null, description: null, namespace: null, inputs: {} };

  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const render = () =>
    (renderResult = testRenderer.render(
      <StepConfigurePackagePolicy
        packageInfo={packageInfo}
        packagePolicy={packagePolicy}
        updatePackagePolicy={mockUpdatePackagePolicy}
        validationResults={validationResults}
        submitAttempted={false}
      />
    ));

  beforeEach(() => {
    packageInfo = {
      name: 'nginx',
      title: 'Nginx',
      version: '1.3.0',
      release: 'ga',
      description: 'Collect logs and metrics from Nginx HTTP servers with Elastic Agent.',
      format_version: '',
      owner: { github: '' },
      assets: {} as any,
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
      latestVersion: '1.3.0',
      removable: true,
      keepPoliciesUpToDate: false,
      status: 'not_installed',
    };
    packagePolicy = {
      name: 'nginx-1',
      description: 'desc',
      namespace: 'default',
      policy_id: '',
      enabled: true,
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
                tags: { value: ['nginx-access'], type: 'text' },
                preserve_original_event: { value: false, type: 'bool' },
                processors: { type: 'yaml' },
              },
            },
          ],
        },
      ],
    };
    testRenderer = createFleetTestRendererMock();
  });

  it('should show nothing to configure if no matching integration', () => {
    packageInfo.policy_templates = [];
    render();

    waitFor(() => {
      expect(renderResult.getByText('Nothing to configure')).toBeInTheDocument();
    });
  });

  it('should show inputs of policy templates and update package policy with input enabled: false', async () => {
    render();

    waitFor(() => {
      expect(renderResult.getByText('Collect logs from Nginx instances')).toBeInTheDocument();
    });
    act(() => {
      fireEvent.click(renderResult.getByRole('switch'));
    });
    expect(mockUpdatePackagePolicy.mock.calls[0][0].inputs[0].enabled).toEqual(false);
  });
});
