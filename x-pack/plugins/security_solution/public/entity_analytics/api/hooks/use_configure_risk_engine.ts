/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { TaskManagerUnavailableResponse } from '../../../../common/api/entity_analytics/common';
import { useEntityAnalyticsRoutes } from '../api';
import type { ConfigureRiskEngineSavedObjectResponse } from '../../../../common/api/entity_analytics/risk_engine/so_configure_route.gen';

interface ConfigureRiskEngineParams {
  includeClosedAlerts: boolean;
  range: { start: string; end: string };
  filter?: object;
}

export const useConfigureSORiskEngineMutation = (
  options?: UseMutationOptions<
    ConfigureRiskEngineSavedObjectResponse,
    { body: ConfigureRiskEngineSavedObjectResponse | TaskManagerUnavailableResponse },
    ConfigureRiskEngineParams
  >
) => {
  const { updateSavedObjectConfiguration } = useEntityAnalyticsRoutes();

  return useMutation<
    ConfigureRiskEngineSavedObjectResponse,
    { body: ConfigureRiskEngineSavedObjectResponse | TaskManagerUnavailableResponse },
    ConfigureRiskEngineParams
  >(
    async (params) => {
      return updateSavedObjectConfiguration({
        includeClosedAlerts: params.includeClosedAlerts,
        range: params.range,
        filter: params.filter,
      });
    },
    {
      ...options,
      onError: (error) => {
        if (error?.response?.data?.error === 'Task Manager is unavailable') {
          return {
            body: {
              configuration_successful: false,
            },
          };
        }
        return {
          body: error.response.data,
        };
      },
    }
  );
};
