/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetInstalledIntegrationsResponse } from '../../../../../common/detection_engine/fleet_integrations';
import type {
  FetchInstalledIntegrationsArgs,
  IFleetIntegrationsApiClient,
} from '../api_client_interface';

export const fleetIntegrationsApi: jest.Mocked<IFleetIntegrationsApiClient> = {
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
