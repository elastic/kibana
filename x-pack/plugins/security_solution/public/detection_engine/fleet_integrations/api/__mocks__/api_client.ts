/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GetAllIntegrationsResponse,
  GetInstalledIntegrationsResponse,
} from '../../../../../common/api/detection_engine/fleet_integrations';
import type {
  FetchAllIntegrationsArgs,
  FetchInstalledIntegrationsArgs,
  IFleetIntegrationsApiClient,
} from '../api_client_interface';

export const fleetIntegrationsApi: jest.Mocked<IFleetIntegrationsApiClient> = {
  fetchAllIntegrations: jest
    .fn<Promise<GetAllIntegrationsResponse>, [FetchAllIntegrationsArgs]>()
    .mockResolvedValue({
      integrations: [
        {
          package_name: 'o365',
          package_title: 'Microsoft 365',
          latest_package_version: '1.2.0',
          installed_package_version: '1.0.0',
          is_installed: false,
          is_enabled: false,
        },
        {
          package_name: 'atlassian_bitbucket',
          package_title: 'Atlassian Bitbucket',
          latest_package_version: '1.0.1',
          installed_package_version: '1.0.1',
          integration_name: 'audit',
          integration_title: 'Audit Logs',
          is_installed: true,
          is_enabled: true,
        },
        {
          package_name: 'system',
          package_title: 'System',
          latest_package_version: '1.6.4',
          installed_package_version: '1.6.4',
          is_installed: true,
          is_enabled: true,
        },
      ],
    }),
  fetchInstalledIntegrations: jest
    .fn<Promise<GetInstalledIntegrationsResponse>, [FetchInstalledIntegrationsArgs]>()
    .mockResolvedValue({
      installed_integrations: [
        {
          package_name: 'atlassian_bitbucket',
          package_title: 'Atlassian Bitbucket',
          package_version: '1.0.1',
          integration_name: 'audit',
          integration_title: 'Audit Logs',
          is_enabled: true,
        },
        {
          package_name: 'system',
          package_title: 'System',
          package_version: '1.6.4',
          is_enabled: true,
        },
      ],
    }),
};
