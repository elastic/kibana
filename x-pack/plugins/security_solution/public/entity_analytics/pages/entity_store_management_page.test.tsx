/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntityStoreManagementPage } from './entity_store_management_page';
import { TestProviders } from '../../common/mock';

jest.mock('../components/entity_store/components/engines_status', () => ({
  EngineStatus: () => <span>{'Mocked Engine Status Tab'}</span>,
}));

const mockUseAssetCriticalityPrivileges = jest.fn();
jest.mock('../components/asset_criticality/use_asset_criticality', () => ({
  useAssetCriticalityPrivileges: () => mockUseAssetCriticalityPrivileges(),
}));

const mockUseIsExperimentalFeatureEnabled = jest.fn();
jest.mock('../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: () => mockUseIsExperimentalFeatureEnabled(),
}));

const mockUseHasSecurityCapability = jest.fn().mockReturnValue(true);
jest.mock('../../helper_hooks', () => ({
  useHasSecurityCapability: () => mockUseHasSecurityCapability(),
}));

const mockUseEntityEngineStatus = jest.fn();
jest.mock('../components/entity_store/hooks/use_entity_store', () => ({
  useEntityStoreStatus: () => mockUseEntityEngineStatus(),
}));

const mockUseEntityEnginePrivileges = jest.fn();
jest.mock('../components/entity_store/hooks/use_entity_engine_privileges', () => ({
  useEntityEnginePrivileges: () => mockUseEntityEnginePrivileges(),
}));

describe('EntityStoreManagementPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAssetCriticalityPrivileges.mockReturnValue({
      isLoading: false,
      data: { has_write_permissions: true },
    });

    mockUseEntityEnginePrivileges.mockReturnValue({
      data: { has_all_required: true },
    });

    mockUseEntityEngineStatus.mockReturnValue({
      status: 'enabled',
      errors: [],
    });

    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
  });

  it('does not render page when asset criticality is loading', () => {
    mockUseAssetCriticalityPrivileges.mockReturnValue({
      isLoading: true,
    });

    render(<EntityStoreManagementPage />, { wrapper: TestProviders });

    expect(screen.queryByTestId('entityStoreManagementPage')).not.toBeInTheDocument();
  });

  it('renders the page header', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    render(<EntityStoreManagementPage />, { wrapper: TestProviders });

    expect(screen.getByTestId('entityStoreManagementPage')).toBeInTheDocument();
    expect(screen.getByText('Entity Store')).toBeInTheDocument();
  });

  it('disables the switch when status is loading', () => {
    mockUseEntityEngineStatus.mockReturnValue({
      status: 'loading',
      errors: [],
    });

    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    render(<EntityStoreManagementPage />, { wrapper: TestProviders });

    expect(screen.getByTestId('entity-store-switch')).toBeDisabled();
  });

  it('show clear entity data modal when clear data button clicked', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    render(<EntityStoreManagementPage />, { wrapper: TestProviders });

    fireEvent.click(screen.getByText('Clear Entity Data'));

    expect(screen.getByText('Clear Entity data?')).toBeInTheDocument();
  });

  it('renders the AssetCriticalityIssueCallout when there is an error', () => {
    mockUseAssetCriticalityPrivileges.mockReturnValue({
      isLoading: false,
      error: { body: { message: 'Error message', status_code: 403 } },
    });

    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    render(<EntityStoreManagementPage />, { wrapper: TestProviders });

    expect(
      screen.getByText('Asset criticality CSV file upload functionality unavailable.')
    ).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('renders the InsufficientAssetCriticalityPrivilegesCallout when there are no write permissions', () => {
    mockUseAssetCriticalityPrivileges.mockReturnValue({
      isLoading: false,
      data: { has_write_permissions: false },
    });

    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    render(<EntityStoreManagementPage />, { wrapper: TestProviders });

    expect(
      screen.getByText('Insufficient index privileges to perform CSV upload')
    ).toBeInTheDocument();
  });

  it('selects the Import tab by default', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    render(<EntityStoreManagementPage />, { wrapper: TestProviders });

    expect(screen.getByText('Import Entities').parentNode).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to the Status tab when clicked', () => {
    mockUseEntityEngineStatus.mockReturnValue({
      status: 'enabled',
      errors: [],
    });

    mockUseEntityEnginePrivileges.mockReturnValue({
      data: { has_all_required: true },
    });

    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    render(<EntityStoreManagementPage />, { wrapper: TestProviders });

    fireEvent.click(screen.getByText('Engine Status'));

    expect(screen.getByText('Engine Status').parentNode).toHaveAttribute('aria-selected', 'true');
  });

  it('does not render the Status tab when entity store is not installed', () => {
    mockUseEntityEngineStatus.mockReturnValue({
      status: 'not_installed',
      errors: [],
    });

    mockUseEntityEnginePrivileges.mockReturnValue({
      data: { has_all_required: true },
    });

    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    render(<EntityStoreManagementPage />, { wrapper: TestProviders });

    expect(screen.queryByText('Engine Status')).not.toBeInTheDocument();
  });

  it('does not render the Status tab when privileges are missing', () => {
    mockUseEntityEngineStatus.mockReturnValue({
      status: 'enabled',
      errors: [],
    });

    mockUseEntityEnginePrivileges.mockReturnValue({
      data: { has_all_required: false, privileges: { kibana: {}, elasticsearch: {} } },
    });

    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    render(<EntityStoreManagementPage />, { wrapper: TestProviders });

    expect(screen.queryByText('Engine Status')).not.toBeInTheDocument();
  });
});
