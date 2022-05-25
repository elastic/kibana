/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { GetInstalledIntegrationsResponse } from '../../../../../common/detection_engine/schemas/response/get_installed_integrations_response_schema';
import { fetchInstalledIntegrations } from './api';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import * as i18n from './translations';

export interface UseInstalledIntegrationsArgs {
  packages?: string[];
}

export const useInstalledIntegrations = ({ packages }: UseInstalledIntegrationsArgs) => {
  const { addError } = useAppToasts();

  return useQuery<GetInstalledIntegrationsResponse>(
    [
      'installedIntegrations',
      {
        packages,
      },
    ],
    async ({ signal }) => {
      return fetchInstalledIntegrations({
        packages,
        signal,
      });
    },
    {
      keepPreviousData: true,
      onError: (e) => {
        addError(e, { title: i18n.INSTALLED_INTEGRATIONS_FETCH_FAILURE });
      },
    }
  );
};
