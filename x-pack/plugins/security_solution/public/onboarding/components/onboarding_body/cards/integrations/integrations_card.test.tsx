/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { IntegrationsCard } from './integrations_card';
import { of } from 'rxjs';
import { useOnboardingService } from '../../../../hooks/use_onboarding_service';

jest.mock('../../../../hooks/use_onboarding_service', () => ({
  useOnboardingService: jest.fn(),
}));

jest.mock('./const', () => ({
  AGENTLESS_LEARN_MORE_LINK: 'https://www.elastic.co',
}));

jest.mock('./available_packages');
jest.mock('./packages_installed_callout');
jest.mock('./agentless_available_callout');

jest.mock('./const', () => ({
  AGENTLESS_LEARN_MORE_LINK: 'https://www.elastic.co',
}));

const props = {
  setComplete: jest.fn(),
  isCardComplete: jest.fn(),
  setExpandedCardId: jest.fn(),
};

describe('IntegrationsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useOnboardingService as jest.Mock).mockReturnValue({ isAgentlessAvailable$: of(false) });
  });

  it('renders the callout and available packages when integrations are Installed', async () => {
    const mockMetadata = {
      integrationsInstalled: 3,
      agentStillRequired: false,
    };

    const { getByTestId } = render(
      <IntegrationsCard {...props} checkCompleteMetadata={mockMetadata} />
    );
    await waitFor(() => {
      expect(getByTestId('packageInstalledCallout')).toBeInTheDocument();
    });
  });

  it('renders the agentless available callout', async () => {
    (useOnboardingService as jest.Mock).mockReturnValue({ isAgentlessAvailable$: of(true) });

    const mockMetadata = {
      integrationsInstalled: 0,
      agentStillRequired: false,
    };

    const { getByTestId } = render(
      <IntegrationsCard {...props} checkCompleteMetadata={mockMetadata} />
    );

    await waitFor(() => {
      expect(getByTestId('agentlessAvailableCallout')).toBeInTheDocument();
    });
  });
});
