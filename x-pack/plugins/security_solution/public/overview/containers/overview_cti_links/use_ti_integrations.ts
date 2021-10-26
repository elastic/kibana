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

interface Integration {
  id: string;
  status: string;
}

interface TIIntegrationStatus {
  someIntegrationsIsInstalled: boolean | undefined;
  someIntegrationsIsDisabled: boolean | undefined;
  installedIntegrationsId: string[];
}

export const useTIIntegrations = () => {
  const [TIIntegrationsStatus, setTIIntegrationsStatus] = useState<TIIntegrationStatus | null>(
    null
  );

  useEffect(() => {
    const getPackages = async () => {
      try {
        const { response: integrations } = await KibanaServices.get().http.fetch(
          EPM_API_ROUTES.LIST_PATTERN,
          {
            method: 'GET',
          }
        );
        const tiIntegrations = integrations.filter((integration: Integration) =>
          integration.id.startsWith(TI_INTEGRATION_PREFIX)
        );

        const installedIntegrations = tiIntegrations.filter(
          (integration: Integration) => integration.status === installationStatuses.Installed
        );
        const someIntegrationsIsDisabled = tiIntegrations.some(
          (integration: Integration) => integration.status !== installationStatuses.Installed
        );

        setTIIntegrationsStatus({
          someIntegrationsIsDisabled,
          someIntegrationsIsInstalled: installedIntegrations.length > 0,
          installedIntegrationsId: installedIntegrations.map(
            (integration: Integration) => integration.id
          ),
        });
      } catch (e) {
        setTIIntegrationsStatus({
          someIntegrationsIsInstalled: undefined,
          someIntegrationsIsDisabled: undefined,
          installedIntegrationsId: [],
        });
      }
    };

    getPackages();
  }, []);

  return TIIntegrationsStatus;
};
