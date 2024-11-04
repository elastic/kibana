/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { InstalledIntegrationsCallout } from './installed_integrations_callout';
jest.mock('./agent_required_callout');
jest.mock('./manage_integrations_callout');

describe('InstalledIntegrationsCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the callout and available packages when integrations are installed', () => {
    const mockMetadata = {
      installedIntegrationsCount: 3,
      isAgentRequired: false,
    };

    const { getByTestId } = render(<InstalledIntegrationsCallout {...mockMetadata} />);

    expect(getByTestId('manageIntegrationsCallout')).toBeInTheDocument();
  });

  it('renders the warning callout when an agent is still required', () => {
    const mockMetadata = {
      installedIntegrationsCount: 2,
      isAgentRequired: true,
    };

    const { getByTestId } = render(<InstalledIntegrationsCallout {...mockMetadata} />);

    expect(getByTestId('agentRequiredCallout')).toBeInTheDocument();
  });
});
