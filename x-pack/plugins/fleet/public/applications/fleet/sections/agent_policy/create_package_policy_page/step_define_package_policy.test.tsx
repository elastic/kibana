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
import type { AgentPolicy, NewPackagePolicy, PackageInfo } from '../../../types';

import { useGetPackagePolicies } from '../../../hooks';

import { StepDefinePackagePolicy } from './step_define_package_policy';

jest.mock('../../../hooks', () => {
  return {
    ...jest.requireActual('../../../hooks'),
    useGetPackagePolicies: jest.fn().mockReturnValue({
      data: {
        items: [{ name: 'nginx-1' }, { name: 'other-policy' }],
      },
      isLoading: false,
    }),
    useFleetStatus: jest.fn().mockReturnValue({ isReady: true } as any),
    sendGetStatus: jest
      .fn()
      .mockResolvedValue({ data: { isReady: true, missing_requirements: [] } }),
  };
});

describe('StepDefinePackagePolicy', () => {
  const packageInfo: PackageInfo = {
    name: 'apache',
    version: '1.0.0',
    description: '',
    format_version: '',
    release: 'ga',
    owner: { github: '' },
    title: 'Apache',
    latestVersion: '',
    assets: {} as any,
    status: 'not_installed',
    vars: [
      {
        show_user: true,
        name: 'Show user var',
        type: 'string',
        default: 'showUserVarVal',
      },
      {
        required: true,
        name: 'Required var',
        type: 'bool',
      },
      {
        name: 'Advanced var',
        type: 'bool',
        default: true,
      },
    ],
  };
  const agentPolicy: AgentPolicy = {
    id: 'agent-policy-1',
    namespace: 'ns',
    name: 'Agent policy 1',
    is_managed: false,
    status: 'active',
    updated_at: '',
    updated_by: '',
    revision: 1,
    package_policies: [],
  };
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
      <StepDefinePackagePolicy
        agentPolicy={agentPolicy}
        packageInfo={packageInfo}
        packagePolicy={packagePolicy}
        updatePackagePolicy={mockUpdatePackagePolicy}
        validationResults={validationResults}
        submitAttempted={false}
      />
    ));

  beforeEach(() => {
    packagePolicy = {
      name: '',
      description: 'desc',
      namespace: 'default',
      policy_id: '',
      enabled: true,
      output_id: '',
      inputs: [],
    };
    testRenderer = createFleetTestRendererMock();
  });

  describe('default API response', () => {
    beforeEach(() => {
      render();
    });

    it('should set index 1 name to package policy on init if no package policies exist for this package', () => {
      waitFor(() => {
        expect(renderResult.getByDisplayValue('apache-1')).toBeInTheDocument();
        expect(renderResult.getByDisplayValue('desc')).toBeInTheDocument();
      });

      expect(mockUpdatePackagePolicy.mock.calls[0]).toEqual([
        {
          description: 'desc',
          enabled: true,
          inputs: [],
          name: 'apache-1',
          namespace: 'default',
          policy_id: 'agent-policy-1',
          output_id: '',
          package: {
            name: 'apache',
            title: 'Apache',
            version: '1.0.0',
          },
          vars: {
            'Advanced var': {
              type: 'bool',
              value: true,
            },
            'Required var': {
              type: 'bool',
              value: undefined,
            },
            'Show user var': {
              type: 'string',
              value: 'showUserVarVal',
            },
          },
        },
      ]);
      expect(mockUpdatePackagePolicy.mock.calls[1]).toEqual([
        {
          namespace: 'ns',
          policy_id: 'agent-policy-1',
        },
      ]);
    });

    it('should display vars coming from package policy', async () => {
      waitFor(() => {
        expect(renderResult.getByDisplayValue('showUserVarVal')).toBeInTheDocument();
        expect(renderResult.getByRole('switch')).toHaveAttribute('aria-label', 'Required var');
        expect(renderResult.getByText('Required var is required')).toHaveAttribute(
          'class',
          'euiFormErrorText'
        );
      });

      await act(async () => {
        fireEvent.click(renderResult.getByText('Advanced options').closest('button')!);
      });

      waitFor(() => {
        expect(renderResult.getByRole('switch')).toHaveAttribute('aria-label', 'Advanced var');
      });
    });
  });

  it('should set incremented name if other package policies exist', () => {
    (useGetPackagePolicies as jest.MockedFunction<any>).mockReturnValueOnce({
      data: {
        items: [
          { name: 'apache-1' },
          { name: 'apache-2' },
          { name: 'apache-9' },
          { name: 'apache-10' },
        ],
      },
      isLoading: false,
    });

    render();

    waitFor(() => {
      expect(renderResult.getByDisplayValue('apache-11')).toBeInTheDocument();
    });
  });
});
