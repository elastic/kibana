/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { useEffect, useMemo, useState } from 'react';
import { useObservable, withOptionalSignal } from '@kbn/securitysolution-hook-utils';
import { createFilter } from '../../../../common/containers/helpers';

import {
  getHostRiskIndex,
  HostRiskSeverity,
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
import { ESTermQuery } from '../../../../../common/typed_json';

export type RiskyHostsScoreRequestOptions = RequestBasicOptions;

type GetHostsRiskScoreProps = RiskyHostsScoreRequestOptions & {
  data: DataPublicPluginStart;
  signal: AbortSignal;
};

const getRiskyHosts = ({
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

const getRiskyHostsComplete = (
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
  filterQuery?: string | ESTermQuery;
  from: string;
  to: string;
  skip?: boolean;
}
export type SeverityCount = {
  [k in HostRiskSeverity]: number;
};

interface RiskScoreKpi {
  error: unknown;
  isModuleDisabled: boolean;
  severityCount: SeverityCount;
  loading: boolean;
}

export const useRiskScoreKpi = ({
  filterQuery,
  from,
  to,
  skip,
}: UseRiskyHostProps): RiskScoreKpi => {
  const { error, result, start, loading } = useRiskyHostsComplete();
  const { data, spaces } = useKibana().services;
  const isModuleDisabled = !!error && isIndexNotFoundError(error);
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

  const severityCount = useMemo(
    () => ({
      [HostRiskSeverity.unknown]: 0,
      [HostRiskSeverity.low]: 0,
      [HostRiskSeverity.moderate]: 0,
      [HostRiskSeverity.high]: 0,
      [HostRiskSeverity.critical]: 0,
      ...(result?.riskyHosts ?? {}),
    }),
    [result]
  );
  return { error, severityCount, loading, isModuleDisabled };
};
