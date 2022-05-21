/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { RelatedIntegrationArray } from '../../../../../common/detection_engine/schemas/common';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import * as i18n from './translations';

export interface UseInstalledIntegrationsArgs {
  packages?: string[];
}

export const useInstalledIntegrations = ({ packages }: UseInstalledIntegrationsArgs) => {
  const { addError } = useAppToasts();

  return useQuery<RelatedIntegrationArray>(
    [
      'installedIntegrations',
      {
        packages,
      },
    ],
    async ({ signal }) => {
      // Mock data
      const mockInstalledIntegrations = [
        {
          package: 'system',
          version: '1.6.4',
        },
        // {
        //   package: 'aws',
        //   integration: 'cloudtrail',
        //   version: '1.11.0',
        // },
      ];
      return mockInstalledIntegrations;

      // Or fetch from new API
      // return fetchInstalledIntegrations({
      //   packages,
      //   signal,
      // });
    },
    {
      keepPreviousData: true,
      onError: (e) => {
        addError(e, { title: i18n.INSTALLED_INTEGRATIONS_FETCH_FAILURE });
      },
    }
  );
};
