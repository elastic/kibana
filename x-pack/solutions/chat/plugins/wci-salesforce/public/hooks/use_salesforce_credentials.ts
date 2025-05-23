/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export interface ValidateCredentialsRequest {
  domain: string;
  clientId: string;
  clientSecret: string;
}

export interface ValidateCredentialsResponse {
  success: boolean;
  message: string;
}

export interface ValidateCredentialsError {
  message: string;
  attributes?: {
    error: string;
  };
}

export const useSalesforceCredentials = () => {
  const {
    services: { http },
  } = useKibana<CoreStart>();

  return useMutation<
    ValidateCredentialsResponse,
    ValidateCredentialsError,
    ValidateCredentialsRequest
  >({
    mutationFn: async (credentials: ValidateCredentialsRequest) => {
      const response = await http.post<ValidateCredentialsResponse>(
        '/internal/wci-salesforce/configuration/ping',
        {
          body: JSON.stringify(credentials),
        }
      );
      return response;
    },
  });
};
