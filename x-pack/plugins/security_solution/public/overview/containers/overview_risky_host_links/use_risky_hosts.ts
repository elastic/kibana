/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

import { useObservable, withOptionalSignal } from '@kbn/securitysolution-hook-utils';
import {
  DataPublicPluginStart,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../src/plugins/data/public';
import {
  HostsQueries,
  HostsRiskyHostsRequestOptions,
  HostsRiskyHostsStrategyResponse,
} from '../../../../common';

type GetRiskyHostsProps = HostsRiskyHostsRequestOptions & {
  data: DataPublicPluginStart;
  signal: AbortSignal;
};

export const getRiskyHosts = ({
  data,
  defaultIndex,
  filterQuery,
  timerange,
  signal,
}: GetRiskyHostsProps): Observable<HostsRiskyHostsStrategyResponse> =>
  data.search.search<HostsRiskyHostsRequestOptions, HostsRiskyHostsStrategyResponse>(
    {
      defaultIndex,
      factoryQueryType: HostsQueries.riskyHosts,
      filterQuery,
      timerange,
    },
    {
      strategy: 'securitySolutionSearchStrategy',
      abortSignal: signal,
    }
  );

export const getRiskyHostsComplete = (
  props: GetRiskyHostsProps
): Observable<HostsRiskyHostsStrategyResponse> => {
  return getRiskyHosts(props).pipe(
    filter((response) => {
      return isErrorResponse(response) || isCompleteResponse(response);
    })
  );
};

const getRiskyHostsWithOptionalSignal = withOptionalSignal(getRiskyHostsComplete);

export const useRiskyHostsComplete = () => useObservable(getRiskyHostsWithOptionalSignal);
