/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { KibanaServices } from '../../../common/lib/kibana';
import { EPM_API_ROUTES, installationStatuses } from '../../../../../fleet/common';
import { TI_INTEGRATION_PREFIX } from '../../../../common/cti/constants';

interface IntegrationResponse {
  id: string;
  status: string;
  savedObject?: {
    attributes?: {
      installed_kibana: Array<{
        type: string;
        id: string;
      }>;
    };
  };
}

export interface Integration {
  id: string;
  dashboardIds: string[];
}

interface TiIntegrationStatus {
  isSomeIntegrationsDisabled: boolean;
}

export const useTiIntegrations = () => {
  const [tiIntegrationsStatus, setTiIntegrationsStatus] = useState<TiIntegrationStatus | null>(
    null
  );

  useEffect(() => {
    const getPackages = async () => {
      try {
        const { response: integrations } = await KibanaServices.get().http.fetch<{
          response: IntegrationResponse[];
        }>(EPM_API_ROUTES.LIST_PATTERN, {
          method: 'GET',
        });
        const tiIntegrations = integrations.filter((integration: IntegrationResponse) =>
          integration.id.startsWith(TI_INTEGRATION_PREFIX)
        );

        const isSomeIntegrationsDisabled = tiIntegrations.some(
          (integration: IntegrationResponse) =>
            integration.status !== installationStatuses.Installed
        );

        setTiIntegrationsStatus({
          isSomeIntegrationsDisabled,
        });
      } catch (e) {
        setTiIntegrationsStatus({
          isSomeIntegrationsDisabled: true,
        });
      }
    };

    getPackages();
  }, []);

  return tiIntegrationsStatus;
};
