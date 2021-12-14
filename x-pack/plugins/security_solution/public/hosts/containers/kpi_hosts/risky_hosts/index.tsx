/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { useEffect, useState } from 'react';
import { useObservable, withOptionalSignal } from '@kbn/securitysolution-hook-utils';
import { createFilter } from '../../../../common/containers/helpers';

import {
  getHostRiskIndex,
  HostsKpiQueries,
  RequestBasicOptions,
} from '../../../../../common/search_strategy';

import {
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../../src/plugins/data/common';
import type { DataPublicPluginStart } from '../../../../../../../../src/plugins/data/public';
import type { HostsKpiRiskyHostsStrategyResponse } from '../../../../../common/search_strategy/security_solution/hosts/kpi/risky_hosts';
import { useKibana } from '../../../../common/lib/kibana';
import { isIndexNotFoundError } from '../../../../common/utils/exceptions';

export type RiskyHostsScoreRequestOptions = RequestBasicOptions;

type GetHostsRiskScoreProps = RiskyHostsScoreRequestOptions & {
  data: DataPublicPluginStart;
  signal: AbortSignal;
};

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

const useRiskyHostsComplete = () => useObservable(getRiskyHostsWithOptionalSignal);

interface UseRiskyHostProps {
  filterQuery?: string;
  from: string;
  to: string;
  skip: boolean;
}

export const useRiskyHosts = ({ filterQuery, from, to, skip }: UseRiskyHostProps) => {
  const { error, result: response, start, loading } = useRiskyHostsComplete();
  const { data, spaces } = useKibana().services;
  const isModuleDisabled = error && isIndexNotFoundError(error);
  const [spaceId, setSpaceId] = useState<string>();

  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => setSpaceId(space.id));
    }
  }, [spaces]);

  useEffect(() => {
    if (!skip && spaceId) {
      start({
        data,
        timerange: { to, from, interval: '' },
        filterQuery,
        defaultIndex: [getHostRiskIndex(spaceId)],
      });
    }
  }, [data, spaceId, start, filterQuery, to, from, skip]);

  return { error, response, loading, isModuleDisabled };
};
