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
  HostsRiskScoreRequestOptions,
  HostsRiskScoreStrategyResponse,
} from '../../../../common';

type GetHostsRiskScoreProps = HostsRiskScoreRequestOptions & {
  data: DataPublicPluginStart;
  signal: AbortSignal;
};

export const getHostsRiskScore = ({
  data,
  defaultIndex,
  timerange,
  hostName,
  signal,
}: GetHostsRiskScoreProps): Observable<HostsRiskScoreStrategyResponse> =>
  data.search.search<HostsRiskScoreRequestOptions, HostsRiskScoreStrategyResponse>(
    {
      defaultIndex,
      factoryQueryType: HostsQueries.hostsRiskScore,
      timerange,
      hostName,
    },
    {
      strategy: 'securitySolutionSearchStrategy',
      abortSignal: signal,
    }
  );

export const getHostsRiskScoreComplete = (
  props: GetHostsRiskScoreProps
): Observable<HostsRiskScoreStrategyResponse> => {
  return getHostsRiskScore(props).pipe(
    filter((response) => {
      return isErrorResponse(response) || isCompleteResponse(response);
    })
  );
};

const getHostsRiskScoreWithOptionalSignal = withOptionalSignal(getHostsRiskScoreComplete);

export const useHostsRiskScoreComplete = () => useObservable(getHostsRiskScoreWithOptionalSignal);
