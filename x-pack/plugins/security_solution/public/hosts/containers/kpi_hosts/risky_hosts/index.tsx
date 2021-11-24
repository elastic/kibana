/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

import { useObservable, withOptionalSignal } from '@kbn/securitysolution-hook-utils';
import { createFilter } from '../../../../common/containers/helpers';

import { HostsKpiQueries, RequestBasicOptions } from '../../../../../common/search_strategy';

import {
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../../src/plugins/data/common';
import type { DataPublicPluginStart } from '../../../../../../../../src/plugins/data/public';
import type { HostsKpiRiskyHostsStrategyResponse } from '../../../../../common/search_strategy/security_solution/hosts/kpi/risky_hosts';

export type RiskyHostsScoreRequestOptions = RequestBasicOptions;

type GetHostsRiskScoreProps = RiskyHostsScoreRequestOptions & {
  data: DataPublicPluginStart;
  signal: AbortSignal;
};

// TODO think/refactor the only differences between this and getHostsRiskScore are factoryQueryType and types
export const getRiskyHosts = ({
  data,
  defaultIndex,
  timerange,
  signal,
  filterQuery,
}: GetHostsRiskScoreProps): Observable<HostsKpiRiskyHostsStrategyResponse> =>
  data.search.search<RiskyHostsScoreRequestOptions, HostsKpiRiskyHostsStrategyResponse>(
    {
      defaultIndex,
      factoryQueryType: HostsKpiQueries.kpiRiskyHosts,
      filterQuery: createFilter(filterQuery),
      timerange,
    },
    {
      strategy: 'securitySolutionSearchStrategy',
      abortSignal: signal,
    }
  );

export const getRiskyHostsComplete = (
  props: GetHostsRiskScoreProps
): Observable<HostsKpiRiskyHostsStrategyResponse> => {
  return getRiskyHosts(props).pipe(
    filter((response) => {
      return isErrorResponse(response) || isCompleteResponse(response);
    })
  );
};

const getRiskyHostsWithOptionalSignal = withOptionalSignal(getRiskyHostsComplete);

export const useRiskyHostsComplete = () => useObservable(getRiskyHostsWithOptionalSignal);
