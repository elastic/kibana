/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ValidateCredentialsRequest } from './use_salesforce_credentials';

export interface SalesforceObjectsResponse {
  standard: string[];
  custom: string[];
}

export const useSalesforceObjects = (credentials: ValidateCredentialsRequest | null) => {
  const {
    services: { http },
  } = useKibana<CoreStart>();

  return useQuery({
    queryKey: ['salesforce-objects', credentials],
    queryFn: async () => {
      if (!credentials) {
        throw new Error('Salesforce credentials are required');
      }

      const response = await http.post<SalesforceObjectsResponse>(
        '/internal/wci-salesforce/configuration/available_sobjects',
        {
          body: JSON.stringify(credentials),
        }
      );
      return response;
    },
    enabled: !!credentials,
  });
};
