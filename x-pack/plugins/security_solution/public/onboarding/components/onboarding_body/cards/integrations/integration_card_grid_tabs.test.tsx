/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { IntegrationsCardGridTabs } from './integration_card_grid_tabs';
import { TestProviders } from '../../../../../common/mock/test_providers';
import * as module from '@kbn/fleet-plugin/public';

jest.mock('@kbn/fleet-plugin/public');
jest.mock('./package_list_grid');

jest
  .spyOn(module, 'AvailablePackagesHook')
  .mockImplementation(() => Promise.resolve({ useAvailablePackages: jest.fn() }));

describe('IntegrationsCardGridTabs', () => {
  const props = {
    installedIntegrationsCount: 1,
    isAgentRequired: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading skeleton while fetching data', () => {
    const { getByTestId } = render(<IntegrationsCardGridTabs {...props} />, {
      wrapper: TestProviders,
    });
    expect(getByTestId('loadingPackages')).toBeInTheDocument();
  });

  it('renders PackageListGrid when data is loaded successfully', async () => {
    const { getByTestId } = render(<IntegrationsCardGridTabs {...props} />, {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(getByTestId('packageListGrid')).toBeInTheDocument();
    });
  });
});
