/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { installationStatuses } from '../../../../../fleet/common';
import { TI_INTEGRATION_PREFIX } from '../../../../common/cti/constants';
import { fetchFleetIntegrations, IntegrationResponse } from './api';

export interface Integration {
  id: string;
  dashboardIds: string[];
}

interface TiIntegrationStatus {
  allIntegrationsInstalled: boolean;
}

export const useTiIntegrations = () => {
  const [tiIntegrationsStatus, setTiIntegrationsStatus] = useState<TiIntegrationStatus | null>(
    null
  );

  useEffect(() => {
    const getPackages = async () => {
      try {
        const { response: integrations } = await fetchFleetIntegrations();
        const tiIntegrations = integrations.filter((integration: IntegrationResponse) =>
          integration.id.startsWith(TI_INTEGRATION_PREFIX)
        );

        const allIntegrationsInstalled = tiIntegrations.every(
          (integration: IntegrationResponse) =>
            integration.status === installationStatuses.Installed
        );

        setTiIntegrationsStatus({
          allIntegrationsInstalled,
        });
      } catch (e) {
        setTiIntegrationsStatus({
          allIntegrationsInstalled: false,
        });
      }
    };

    getPackages();
  }, []);

  return tiIntegrationsStatus;
};
