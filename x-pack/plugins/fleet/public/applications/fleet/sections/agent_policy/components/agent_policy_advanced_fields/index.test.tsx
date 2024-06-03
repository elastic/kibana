/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { act } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';
import type { TestRenderer } from '../../../../../../mock';

import { createAgentPolicyMock, createPackagePolicyMock } from '../../../../../../../common/mocks';
import type { AgentPolicy, NewAgentPolicy } from '../../../../../../../common/types';

import { useLicense } from '../../../../../../hooks/use_license';
import type { LicenseService } from '../../../../../../../common/services';
import { generateNewAgentPolicyWithDefaults } from '../../../../../../../common/services';

import type { ValidationResults } from '../agent_policy_validation';

import { AgentPolicyAdvancedOptionsContent } from '.';

// Mock CustomFields component
jest.mock('./custom_fields', () => ({
  CustomFields: jest.fn(() => <div>Mocked CustomFields Component</div>),
}));

jest.mock('../../../../../../hooks/use_license');

const mockedUseLicence = useLicense as jest.MockedFunction<typeof useLicense>;

describe('Agent policy advanced options content', () => {
  let testRender: TestRenderer;
  let renderResult: RenderResult;
  let mockAgentPolicy: Partial<NewAgentPolicy | AgentPolicy>;
  const mockUpdateAgentPolicy = jest.fn();
  const mockValidation = jest.fn() as unknown as ValidationResults;
  const usePlatinumLicense = () =>
    mockedUseLicence.mockReturnValue({
      hasAtLeast: () => true,
      isPlatinum: () => true,
    } as unknown as LicenseService);

  const renderComponent = ({
    isProtected = false,
    isManaged = false,
    policyId = 'agent-policy-1',
    newAgentPolicy = false,
    packagePolicy = [createPackagePolicyMock()],
  } = {}) => {
    if (newAgentPolicy) {
      mockAgentPolicy = generateNewAgentPolicyWithDefaults();
    } else {
      mockAgentPolicy = {
        ...createAgentPolicyMock(),
        package_policies: packagePolicy,
        id: policyId,
        is_managed: isManaged,
      };
    }

    renderResult = testRender.render(
      <AgentPolicyAdvancedOptionsContent
        agentPolicy={{
          ...mockAgentPolicy,
          is_protected: isProtected,
        }}
        updateAgentPolicy={mockUpdateAgentPolicy}
        validation={mockValidation}
      />
    );
  };

  beforeEach(() => {
    testRender = createFleetTestRendererMock();
    jest.clearAllMocks();
  });

  describe.only('CustomFields component', () => {
    it('should render the mocked custom fields component', () => {
      renderComponent();
      expect(renderResult.getByText('Mocked CustomFields Component')).toBeInTheDocument();
    });
  });

  describe('Agent tamper protection toggle', () => {
    it('should be visible if license is at least platinum', () => {
      usePlatinumLicense();
      renderComponent();
      expect(renderResult.queryByTestId('tamperProtectionSwitch')).toBeInTheDocument();
    });

    it('should not be visible if license is below platinum', () => {
      mockedUseLicence.mockReturnValueOnce({
        isPlatinum: () => false,
        hasAtLeast: () => false,
      } as unknown as LicenseService);
      renderComponent();
      expect(renderResult.queryByTestId('tamperProtectionSwitch')).not.toBeInTheDocument();
    });

    it('should be visible if policy is not managed/hosted', () => {
      usePlatinumLicense();
      renderComponent({ isManaged: false });
      expect(renderResult.queryByTestId('tamperProtectionSwitch')).toBeInTheDocument();
    });

    it('should not be visible if policy is managed/hosted', () => {
      usePlatinumLicense();
      renderComponent({ isManaged: true });
      expect(renderResult.queryByTestId('tamperProtectionSwitch')).not.toBeInTheDocument();
    });

    it('switched to true enables the uninstall command link', async () => {
      usePlatinumLicense();
      renderComponent({ isProtected: true });

      expect(renderResult.getByTestId('tamperProtectionSwitch')).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(renderResult.getByTestId('uninstallCommandLink')).toBeEnabled();
    });

    it('switched to false disables the uninstall command link', () => {
      usePlatinumLicense();
      renderComponent();
      expect(renderResult.getByTestId('tamperProtectionSwitch')).toHaveAttribute(
        'aria-checked',
        'false'
      );
      expect(renderResult.getByTestId('uninstallCommandLink')).toBeDisabled();
    });

    it('when there is no policy id, the uninstall command link is not displayed', async () => {
      usePlatinumLicense();
      renderComponent({ policyId: '' });
      expect(renderResult.queryByTestId('uninstallCommandLink')).not.toBeInTheDocument();
    });

    it('should update agent policy when switched on', async () => {
      usePlatinumLicense();
      renderComponent();
      act(() => {
        renderResult.getByTestId('tamperProtectionSwitch').click();
      });
      expect(mockUpdateAgentPolicy).toHaveBeenCalledWith({ is_protected: true });
    });

    describe('when the defend integration is not installed', () => {
      beforeEach(() => {
        usePlatinumLicense();
        renderComponent({
          packagePolicy: [
            {
              ...createPackagePolicyMock(),
              package: { name: 'not-endpoint', title: 'Not Endpoint', version: '0.1.0' },
            },
          ],
          isProtected: true,
        });
      });

      it('should disable the switch and uninstall command link', () => {
        expect(renderResult.getByTestId('tamperProtectionSwitch')).toBeDisabled();
        expect(renderResult.getByTestId('uninstallCommandLink')).toBeDisabled();
      });

      it('should show an icon tip explaining why the switch is disabled', () => {
        expect(renderResult.getByTestId('tamperMissingIntegrationTooltip')).toBeTruthy();
      });
    });

    describe('when the user is creating a new agent policy', () => {
      it('should be disabled, since it has no package policies and therefore elastic defend integration is not installed', async () => {
        usePlatinumLicense();
        renderComponent({ newAgentPolicy: true });
        expect(renderResult.getByTestId('tamperProtectionSwitch')).toBeDisabled();
      });
    });
  });
});

