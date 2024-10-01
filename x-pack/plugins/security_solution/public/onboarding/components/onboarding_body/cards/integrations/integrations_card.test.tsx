/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { IntegrationsCard } from './integrations_card';
import { useAddIntegrationsUrl } from '../../../../../common/hooks/use_add_integrations_url';
import { useNavigation } from '../../../../../common/lib/kibana';
import { of } from 'rxjs';
import { useOnboardingService } from '../../../../hooks/use_onboarding_service';
import { TestProviders } from '../../../../../common/mock/test_providers';

jest.mock('../../../../../common/hooks/use_add_integrations_url');
jest.mock('../../../../../common/lib/kibana');
jest.mock('./available_packages', () => ({
  AvailablePackages: () => <div data-test-subj="availablePackages" />,
}));
jest.mock('../../../../hooks/use_onboarding_service', () => ({
  useOnboardingService: jest.fn(),
}));

const mockGetAppUrl = jest.fn();
const mockNavigateTo = jest.fn();
const mockOnAddIntegrationsUrl = jest.fn();
(useAddIntegrationsUrl as jest.Mock).mockReturnValue({
  href: '/integrations',
  onClick: mockOnAddIntegrationsUrl,
});

const props = {
  setComplete: jest.fn(),
  isCardComplete: jest.fn(),
  setExpandedCardId: jest.fn(),
};

describe('IntegrationsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useOnboardingService as jest.Mock).mockReturnValue({ isAgentlessAvailable$: of(false) });
    (useNavigation as jest.Mock).mockReturnValue({
      getAppUrl: mockGetAppUrl,
      navigateTo: mockNavigateTo,
    });
  });

  it('renders the callout and available packages when integrations are Installed', async () => {
    const mockMetadata = {
      integrationsInstalled: 3,
      agentStillRequired: false,
    };

    const { getByTestId, getByText } = render(
      <IntegrationsCard {...props} checkCompleteMetadata={mockMetadata} />,
      { wrapper: TestProviders }
    );
    await waitFor(() => {
      expect(getByText('3 integrations have been added')).toBeInTheDocument();
      expect(getByTestId('manageIntegrationsLink')).toBeInTheDocument();
    });
  });

  it('renders the agentless available callout and available packages', async () => {
    (useOnboardingService as jest.Mock).mockReturnValue({ isAgentlessAvailable$: of(true) });

    const mockMetadata = {
      integrationsInstalled: 0,
      agentStillRequired: false,
    };

    const { getByTestId, getByText } = render(
      <IntegrationsCard {...props} checkCompleteMetadata={mockMetadata} />,
      { wrapper: TestProviders }
    );

    await waitFor(() => {
      expect(
        getByText(
          'Identify configuration risks in your cloud account with new and simplified agentless configuration'
        )
      ).toBeInTheDocument();
      expect(getByTestId('agentlessLearnMoreLink')).toBeInTheDocument();
    });
  });

  it('renders the warning callout when an agent is still required', async () => {
    const mockMetadata = {
      integrationsInstalled: 2,
      agentStillRequired: true,
    };

    const { getByTestId, getByText } = render(
      <IntegrationsCard {...props} checkCompleteMetadata={mockMetadata} />,
      { wrapper: TestProviders }
    );
    await waitFor(() => {
      expect(
        getByText(
          'Elastic Agent is required for one or more of your integrations. Add Elastic Agent'
        )
      ).toBeInTheDocument();
      expect(getByTestId('agentLink')).toBeInTheDocument();
    });
  });

  it('handles navigation to the Fleet app when Add Agent is clicked', async () => {
    const mockMetadata = {
      integrationsInstalled: 1,
      agentStillRequired: true,
    };

    const { getByTestId } = render(
      <IntegrationsCard {...props} checkCompleteMetadata={mockMetadata} />,
      { wrapper: TestProviders }
    );

    fireEvent.click(getByTestId('agentLink'));
    await waitFor(() => {
      expect(mockNavigateTo).toHaveBeenCalledWith({ appId: 'fleet', path: '/agents' });
    });
  });

  it('handles clicking on the Manage integrations link', async () => {
    const mockMetadata = {
      integrationsInstalled: 3,
      agentStillRequired: false,
    };

    const { getByTestId } = render(
      <IntegrationsCard {...props} checkCompleteMetadata={mockMetadata} />,
      { wrapper: TestProviders }
    );

    fireEvent.click(getByTestId('manageIntegrationsLink'));
    await waitFor(() => {
      expect(mockOnAddIntegrationsUrl).toHaveBeenCalled();
    });
  });
});
