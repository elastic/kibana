/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { filter } from 'rxjs';

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { isRunningResponse } from '@kbn/data-plugin/common';
import type { EventEnrichmentRequestOptionsInput } from '../../../../../common/api/search_strategy';
import type { CtiEventEnrichmentStrategyResponse } from '../../../../../common/search_strategy/security_solution/cti';
import { CtiQueries } from '../../../../../common/search_strategy/security_solution/cti';

type GetEventEnrichmentProps = Omit<EventEnrichmentRequestOptionsInput, 'factoryQueryType'> & {
  data: DataPublicPluginStart;
  signal: AbortSignal;
};

export const getEventEnrichment = ({
  data,
  defaultIndex,
  eventFields,
  filterQuery,
  timerange,
  signal,
}: GetEventEnrichmentProps): Observable<CtiEventEnrichmentStrategyResponse> =>
  data.search.search<EventEnrichmentRequestOptionsInput, CtiEventEnrichmentStrategyResponse>(
    {
      defaultIndex,
      eventFields,
      factoryQueryType: CtiQueries.eventEnrichment,
      filterQuery,
      timerange,
    },
    {
      strategy: 'securitySolutionSearchStrategy',
      abortSignal: signal,
    }
  );

export const getEventEnrichmentComplete = (
  props: GetEventEnrichmentProps
): Observable<CtiEventEnrichmentStrategyResponse> =>
  getEventEnrichment(props).pipe(filter((response) => !isRunningResponse(response)));
