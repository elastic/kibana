/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { IntegrationsCard } from './integrations_card';
import { useAddIntegrationsUrl } from '../../../../../common/hooks/use_add_integrations_url';
import { useKibana } from '../../../../../common/lib/kibana';

jest.mock('../../../../../common/hooks/use_add_integrations_url');
jest.mock('../../../../../common/lib/kibana');
jest.mock('./available_packages', () => ({
  AvailablePackages: () => <div data-test-subj="availablePackages" />,
}));

const mockNavigateToApp = jest.fn();
(useKibana as jest.Mock).mockReturnValue({
  services: {
    application: {
      navigateToApp: mockNavigateToApp,
    },
  },
});

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
  });

  it('renders the callout and available packages when integrationsInstalled is present', () => {
    const mockMetadata = {
      integrationsInstalled: 3,
      agentStillRequired: false,
    };

    const { getByTestId } = render(
      <IntegrationsCard {...props} checkCompleteMetadata={mockMetadata} />
    );

    expect(getByTestId('integrationsCompleteText')).toBeInTheDocument();
    expect(getByTestId('manageIntegrationsLink')).toBeInTheDocument();
  });

  it('renders the warning callout when an agent is still required', () => {
    const mockMetadata = {
      integrationsInstalled: 2,
      agentStillRequired: true,
    };

    const { getByTestId } = render(
      <IntegrationsCard {...props} checkCompleteMetadata={mockMetadata} />
    );

    expect(getByTestId('agentRequiredText')).toBeInTheDocument();
    expect(getByTestId('agentLink')).toBeInTheDocument();
  });

  it('handles navigation to the Fleet app when Add Agent is clicked', () => {
    const mockMetadata = {
      integrationsInstalled: 1,
      agentStillRequired: true,
    };

    const { getByTestId } = render(
      <IntegrationsCard {...props} checkCompleteMetadata={mockMetadata} />
    );

    fireEvent.click(getByTestId('agentLink'));
    expect(mockNavigateToApp).toHaveBeenCalledWith('fleet', { path: '/agents' });
  });

  it('handles clicking on the Manage integrations link', () => {
    const mockMetadata = {
      integrationsInstalled: 3,
      agentStillRequired: false,
    };

    const { getByTestId } = render(
      <IntegrationsCard {...props} checkCompleteMetadata={mockMetadata} />
    );

    fireEvent.click(getByTestId('manageIntegrationsLink'));
    expect(mockOnAddIntegrationsUrl).toHaveBeenCalled();
  });
});
