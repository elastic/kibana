/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { installedIntegrationsBase, relatedIntegrations } from '../mock';
import { useInstalledIntegrations } from '../use_installed_integrations';
import { getInstalledRelatedIntegrations } from '../utils';
import { IntegrationDescription } from '.';
import { render, screen } from '@testing-library/react';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../use_installed_integrations');

const mockUseInstalledIntegrations = useInstalledIntegrations as jest.Mock;
mockUseInstalledIntegrations.mockReturnValue({
  data: installedIntegrationsBase,
  isLoading: false,
  isFetching: false,
});

describe('IntegrationDescription', () => {
  test('Shows total events returned', () => {
    const { data: allInstalledIntegrations } = useInstalledIntegrations({ packages: [] });

    const integrationDetails = getInstalledRelatedIntegrations(
      relatedIntegrations,
      allInstalledIntegrations
    );
    render(<IntegrationDescription integration={integrationDetails[0]} />);
    expect(screen.getByTestId('integrationLink')).toHaveTextContent('Aws Cloudtrail');
  });
});
