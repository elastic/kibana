/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { waitFor, fireEvent, act } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';
import type { TestRenderer } from '../../../../../../mock';

import { allowedExperimentalValues } from '../../../../../../../common/experimental_features';

import { ExperimentalFeaturesService } from '../../../../../../services/experimental_features';

import type { NewAgentPolicy, AgentPolicy } from '../../../../../../../common/types';

import { useLicense } from '../../../../../../hooks/use_license';

import type { LicenseService } from '../../../../../../../common/services';

import type { ValidationResults } from '../agent_policy_validation';

import { AgentPolicyAdvancedOptionsContent } from '.';

jest.mock('../../../../../../hooks/use_license');

const mockedUseLicence = useLicense as jest.MockedFunction<typeof useLicense>;

describe('Agent policy advanced options content', () => {
  let testRender: TestRenderer;
  let renderResult: RenderResult;

  const mockAgentPolicy: Partial<NewAgentPolicy | AgentPolicy> = {
    id: 'agent-policy-1',
    name: 'some-agent-policy',
    is_managed: false,
    is_protected: false,
  };

  const mockUpdateAgentPolicy = jest.fn();
  const mockValidation = jest.fn() as unknown as ValidationResults;
  const usePlatinumLicense = () =>
    mockedUseLicence.mockReturnValue({
      hasAtLeast: () => true,
      isPlatinum: () => true,
    } as unknown as LicenseService);

  const render = () => {
    // remove when feature flag is removed
    ExperimentalFeaturesService.init({
      ...allowedExperimentalValues,
      agentTamperProtectionEnabled: true,
    });

    renderResult = testRender.render(
      <AgentPolicyAdvancedOptionsContent
        agentPolicy={mockAgentPolicy}
        updateAgentPolicy={mockUpdateAgentPolicy}
        validation={mockValidation}
      />
    );
  };

  beforeEach(() => {
    testRender = createFleetTestRendererMock();
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Agent tamper protection toggle', () => {
    it('should be visible if license is at least platinum', () => {
      usePlatinumLicense();
      render();
      expect(renderResult.queryByTestId('tamperProtectionSwitch')).toBeInTheDocument();
    });

    it('should not be visible if license is below platinum', () => {
      mockedUseLicence.mockReturnValueOnce({
        isPlatinum: () => false,
        hasAtLeast: () => false,
      } as unknown as LicenseService);
      render();
      expect(renderResult.queryByTestId('tamperProtectionSwitch')).not.toBeInTheDocument();
    });
    it('switched to true enables the uninstall command link', async () => {
      usePlatinumLicense();
      render();
      await act(async () => {
        fireEvent.click(renderResult.getByTestId('tamperProtectionSwitch'));
      });
      waitFor(() => {
        expect(renderResult.getByTestId('tamperProtectionSwitch')).toBeChecked();
        expect(renderResult.getByTestId('uninstallCommandLink')).toBeEnabled();
      });
    });
    it('switched to false disables the uninstall command link', () => {
      usePlatinumLicense();
      render();
      expect(renderResult.getByTestId('tamperProtectionSwitch')).not.toBeChecked();
      expect(renderResult.getByTestId('uninstallCommandLink')).toBeDisabled();
    });
    it('should update agent policy when switched on', async () => {
      usePlatinumLicense();
      render();
      await act(async () => {
        (await renderResult.findByTestId('tamperProtectionSwitch')).click();
      });
      expect(mockUpdateAgentPolicy).toHaveBeenCalledWith({ is_protected: true });
    });
  });
});
