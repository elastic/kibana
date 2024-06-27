/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';

import { getInheritedNamespace } from '../../../../../../../../common/services';

import type { TestRenderer } from '../../../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../../../mock';
import type { AgentPolicy, NewPackagePolicy, PackageInfo } from '../../../../../types';

import { StepDefinePackagePolicy } from './step_define_package_policy';

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
  const agentPolicies: AgentPolicy[] = [
    {
      id: 'agent-policy-1',
      namespace: 'ns',
      name: 'Agent policy 1',
      is_managed: false,
      status: 'active',
      updated_at: '',
      updated_by: '',
      revision: 1,
      package_policies: [],
      is_protected: false,
    },
    {
      id: 'agent-policy-2',
      namespace: 'default',
      name: 'Agent policy 2',
      is_managed: false,
      status: 'active',
      updated_at: '',
      updated_by: '',
      revision: 1,
      package_policies: [],
      is_protected: false,
    },
  ];
  let packagePolicy: NewPackagePolicy;
  const mockUpdatePackagePolicy = jest.fn().mockImplementation((val: any) => {
    packagePolicy = {
      ...val,
      ...packagePolicy,
    };
  });

  const validationResults = {
    name: null,
    description: null,
    namespace: null,
    inputs: {},
    vars: {},
  };

  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const render = () =>
    (renderResult = testRenderer.render(
      <StepDefinePackagePolicy
        namespacePlaceholder={getInheritedNamespace(agentPolicies)}
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
      policy_ids: [''],
      enabled: true,
      inputs: [],
    };
    testRenderer = createFleetTestRendererMock();
  });

  describe('default API response', () => {
    beforeEach(() => {
      render();
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
        expect(renderResult.getByTestId('packagePolicyNamespaceInput')).toHaveAttribute(
          'placeholder',
          'ns'
        );
      });
    });
  });

  describe('update', () => {
    describe('when package vars are introduced in a new package version', () => {
      it('should display new package vars', () => {
        render();

        waitFor(async () => {
          expect(renderResult.getByDisplayValue('showUserVarVal')).toBeInTheDocument();
          expect(renderResult.getByText('Required var')).toBeInTheDocument();

          await act(async () => {
            fireEvent.click(renderResult.getByText('Advanced options').closest('button')!);
          });

          expect(renderResult.getByText('Advanced var')).toBeInTheDocument();
        });
      });
    });
  });
});
