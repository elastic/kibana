/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { InstalledIntegrationArray } from '../../../../../common/detection_engine/fleet_integrations';
import { fleetIntegrationsApi } from '../../../../detection_engine/fleet_integrations';
// import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
// import * as i18n from './translations';

const ONE_MINUTE = 60000;

export interface UseInstalledIntegrationsArgs {
  packages?: string[];
}

export const useInstalledIntegrations = ({ packages }: UseInstalledIntegrationsArgs) => {
  // const { addError } = useAppToasts();

  return useQuery<InstalledIntegrationArray>(
    [
      'installedIntegrations',
      {
        packages,
      },
    ],
    async ({ signal }) => {
      const integrations = await fleetIntegrationsApi.fetchInstalledIntegrations({
        packages,
        signal,
      });
      return integrations.installed_integrations ?? [];
    },
    {
      keepPreviousData: true,
      staleTime: ONE_MINUTE * 5,
      onError: (e) => {
        // Suppressing for now to prevent excessive errors when fleet isn't configured
        // addError(e, { title: i18n.INTEGRATIONS_FETCH_FAILURE });
      },
    }
  );
};
