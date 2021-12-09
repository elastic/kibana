/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { QueryObserverResult, useQuery } from 'react-query';
import { ServerApiError } from '../../../../../common/types';
import { useHttp } from '../../../../../common/lib/kibana/hooks';
import { EventFiltersHttpService } from '../../../event_filters/service';

export function useGetAllAssignedEventFilters(
  policyId?: string
): QueryObserverResult<FoundExceptionListItemSchema, ServerApiError> {
  const http = useHttp();
  const eventFiltersService = new EventFiltersHttpService(http);

  return useQuery<FoundExceptionListItemSchema, ServerApiError>(
    ['eventFilters', 'assigned', policyId],
    () => {
      return eventFiltersService.getList({
        filter: `(exception-list-agnostic.attributes.tags:"policy:${policyId}" OR exception-list-agnostic.attributes.tags:"policy:all")`,
      });
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      enabled: !!policyId,
      refetchOnMount: true,
    }
  );
}
