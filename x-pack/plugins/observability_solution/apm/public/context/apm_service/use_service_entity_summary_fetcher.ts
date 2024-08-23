/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '../../hooks/use_fetcher';
import { APIReturnType } from '../../services/rest/create_call_apm_api';
import { useEntityManagerEnablementContext } from '../entity_manager_context/use_entity_manager_enablement_context';

export type ServiceEntitySummary =
  APIReturnType<'GET /internal/apm/entities/services/{serviceName}/summary'>;

export function useServiceEntitySummaryFetcher({
  serviceName,
  start,
  end,
  environment,
}: {
  serviceName?: string;
  start?: string;
  end?: string;
  environment?: string;
}) {
  const { isEntityCentricExperienceViewEnabled } = useEntityManagerEnablementContext();

  const { data, status } = useFetcher(
    (callAPI) => {
      if (isEntityCentricExperienceViewEnabled && serviceName && start && end && environment) {
        return callAPI('GET /internal/apm/entities/services/{serviceName}/summary', {
          params: { path: { serviceName }, query: { end, environment, start } },
        });
      }
    },
    [end, environment, isEntityCentricExperienceViewEnabled, serviceName, start]
  );

  return { serviceEntitySummary: data, serviceEntitySummaryStatus: status };
}
