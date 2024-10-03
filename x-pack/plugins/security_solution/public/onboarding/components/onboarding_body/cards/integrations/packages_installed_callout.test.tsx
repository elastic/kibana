/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { PackageInstalledCallout } from './packages_installed_callout';
import { useAddIntegrationsUrl } from '../../../../../common/hooks/use_add_integrations_url';
import { TestProviders } from '../../../../../common/mock/test_providers';

jest.mock('../../../../../common/hooks/use_add_integrations_url');
jest.mock('./agent_required_callout');
const mockOnAddIntegrationsUrl = jest.fn();

describe('PackageInstalledCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAddIntegrationsUrl as jest.Mock).mockReturnValue({
      href: '/integrations',
      onClick: mockOnAddIntegrationsUrl,
    });
  });

  it('renders the callout and available packages when integrations are installed', () => {
    const mockMetadata = {
      integrationsInstalled: 3,
      agentStillRequired: false,
    };

    const { getByTestId, getByText } = render(
      <PackageInstalledCallout checkCompleteMetadata={mockMetadata} />,
      { wrapper: TestProviders }
    );

    expect(getByText('3 integrations have been added')).toBeInTheDocument();
    expect(getByTestId('manageIntegrationsLink')).toBeInTheDocument();
  });

  it('renders the warning callout when an agent is still required', () => {
    const mockMetadata = {
      integrationsInstalled: 2,
      agentStillRequired: true,
    };

    const { getByTestId } = render(
      <PackageInstalledCallout checkCompleteMetadata={mockMetadata} />,
      { wrapper: TestProviders }
    );

    expect(getByTestId('agentRequiredCallout')).toBeInTheDocument();
  });

  it('handles clicking on the Manage integrations link', () => {
    const mockMetadata = {
      integrationsInstalled: 3,
      agentStillRequired: false,
    };

    const { getByTestId } = render(
      <PackageInstalledCallout checkCompleteMetadata={mockMetadata} />,
      { wrapper: TestProviders }
    );

    fireEvent.click(getByTestId('manageIntegrationsLink'));
    expect(mockOnAddIntegrationsUrl).toHaveBeenCalled();
  });
});
