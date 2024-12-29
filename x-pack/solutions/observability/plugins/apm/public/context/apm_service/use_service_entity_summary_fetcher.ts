/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEntityCentricExperienceSetting } from '../../hooks/use_entity_centric_experience_setting';
import { useFetcher } from '../../hooks/use_fetcher';
import { APIReturnType } from '../../services/rest/create_call_apm_api';

export type ServiceEntitySummary =
  APIReturnType<'GET /internal/apm/entities/services/{serviceName}/summary'>;

export function useServiceEntitySummaryFetcher({
  serviceName,
  environment,
}: {
  serviceName?: string;
  start?: string;
  end?: string;
  environment?: string;
}) {
  const { isEntityCentricExperienceEnabled } = useEntityCentricExperienceSetting();

  const { data, status } = useFetcher(
    (callAPI) => {
      if (isEntityCentricExperienceEnabled && serviceName && environment) {
        return callAPI('GET /internal/apm/entities/services/{serviceName}/summary', {
          params: { path: { serviceName }, query: { environment } },
        });
      }
    },
    [environment, isEntityCentricExperienceEnabled, serviceName]
  );

  return { serviceEntitySummary: data, serviceEntitySummaryStatus: status };
}
