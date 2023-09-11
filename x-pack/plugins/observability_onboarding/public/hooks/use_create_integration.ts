/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import deepEqual from 'react-fast-compare';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useTrackedPromise } from '@kbn/use-tracked-promise';
import { i18n } from '@kbn/i18n';

export interface IntegrationOptions {
  integrationName: string;
  datasets: Array<{
    name: string;
    type: 'logs';
  }>;
}

// Errors
const GENERIC_ERROR_MESSAGE = i18n.translate(
  'xpack.observability_onboarding.useCreateIntegration.integrationError.genericError',
  {
    defaultMessage: 'Unable to create an integration',
  }
);

type ErrorType = 'NamingCollision' | 'AuthorizationError' | 'UnknownError';
export interface IntegrationError {
  type: ErrorType;
  message: string;
}

export const useCreateIntegration = ({
  onIntegrationCreationSuccess,
  onIntegrationCreationFailure,
  initialLastCreatedIntegration,
  deletePreviousIntegration = true,
}: {
  integrationOptions?: IntegrationOptions;
  onIntegrationCreationSuccess: (integration: IntegrationOptions) => void;
  onIntegrationCreationFailure: (error: IntegrationError) => void;
  initialLastCreatedIntegration?: IntegrationOptions;
  deletePreviousIntegration?: boolean;
}) => {
  const {
    services: { http },
  } = useKibana();
  const [lastCreatedIntegration, setLastCreatedIntegration] = useState<
    IntegrationOptions | undefined
  >(initialLastCreatedIntegration);

  const [createIntegrationRequest, callCreateIntegration] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async (integrationOptions) => {
        if (lastCreatedIntegration && deletePreviousIntegration) {
          await http?.delete(
            `/api/fleet/epm/packages/${lastCreatedIntegration.integrationName}/1.0.0`,
            {}
          );
        }
        await http?.post('/api/fleet/epm/custom_integrations', {
          body: JSON.stringify(integrationOptions),
        });

        return integrationOptions;
      },
      onResolve: (integrationOptions: IntegrationOptions) => {
        setLastCreatedIntegration(integrationOptions);
        onIntegrationCreationSuccess(integrationOptions!);
      },
      onReject: (requestError: any) => {
        if (requestError?.body?.statusCode === 409) {
          onIntegrationCreationFailure({
            type: 'NamingCollision' as const,
            message: requestError.body.message,
          });
        } else if (requestError?.body?.statusCode === 403) {
          onIntegrationCreationFailure({
            type: 'AuthorizationError' as const,
            message: requestError?.body?.message,
          });
        } else {
          onIntegrationCreationFailure({
            type: 'UnknownError' as const,
            message: requestError?.body?.message ?? GENERIC_ERROR_MESSAGE,
          });
        }
      },
    },
    [
      lastCreatedIntegration,
      deletePreviousIntegration,
      onIntegrationCreationSuccess,
      onIntegrationCreationFailure,
      setLastCreatedIntegration,
    ]
  );

  const createIntegration = useCallback(
    (integrationOptions: IntegrationOptions) => {
      // Bypass creating the integration again
      if (deepEqual(integrationOptions, lastCreatedIntegration)) {
        onIntegrationCreationSuccess(integrationOptions);
      } else {
        callCreateIntegration(integrationOptions);
      }
    },
    [
      callCreateIntegration,
      lastCreatedIntegration,
      onIntegrationCreationSuccess,
    ]
  );

  return {
    createIntegration,
    createIntegrationRequest,
  };
};
