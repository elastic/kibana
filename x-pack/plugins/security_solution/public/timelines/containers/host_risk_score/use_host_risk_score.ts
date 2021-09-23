/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

import { i18n } from '@kbn/i18n';

import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { useObservable, withOptionalSignal } from '@kbn/securitysolution-hook-utils';

import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../common/lib/kibana';
import { inputsActions } from '../../../common/store/actions';
import { RISKY_HOSTS_INDEX } from '../../../../common/constants';
import { isIndexNotFoundError } from '../../../common/utils/exceptions';

import {
  DataPublicPluginStart,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../src/plugins/data/public';
import {
  HostsQueries,
  HostRiskScoreRequestOptions,
  HostRiskScoreStrategyResponse,
} from '../../../../common';

type GetHostRiskScoreProps = HostRiskScoreRequestOptions & {
  data: DataPublicPluginStart;
  signal: AbortSignal;
};

const getHostsRiskScore = ({
  data,
  defaultIndex,
  hostName,
  signal,
}: GetHostRiskScoreProps): Observable<HostRiskScoreStrategyResponse> =>
  data.search.search<HostRiskScoreRequestOptions, HostRiskScoreStrategyResponse>(
    {
      defaultIndex,
      factoryQueryType: HostsQueries.riskScore,
      hostName,
    },
    {
      strategy: 'securitySolutionSearchStrategy',
      abortSignal: signal,
    }
  );

const getHostRiskScoreComplete = (
  props: GetHostRiskScoreProps
): Observable<HostRiskScoreStrategyResponse> => {
  return getHostsRiskScore(props).pipe(
    filter((response) => {
      return isErrorResponse(response) || isCompleteResponse(response);
    })
  );
};

const getHostRiskScoreWithOptionalSignal = withOptionalSignal(getHostRiskScoreComplete);

const useHostRiskScoreComplete = () => useObservable(getHostRiskScoreWithOptionalSignal);

const QUERY_ID = 'host_risk_score';
const noop = () => {};

export interface HostRiskScore {
  loading: boolean;
  isModuleEnabled?: boolean;
  fields: Array<{ field: string; value: string }>;
}

export const useHostRiskScore = ({ hostName }: { hostName?: string }): HostRiskScore => {
  const [isModuleEnabled, setIsModuleEnabled] = useState<boolean | undefined>(undefined);

  const { addError } = useAppToasts();
  const { data } = useKibana().services;

  const dispatch = useDispatch();

  const { error, loading, result, start } = useHostRiskScoreComplete();

  const deleteQuery = useCallback(() => {
    dispatch(inputsActions.deleteOneQuery({ inputId: 'global', id: QUERY_ID }));
  }, [dispatch]);

  useEffect(() => {
    if (!loading && result) {
      setIsModuleEnabled(true);
      dispatch(
        inputsActions.setQuery({
          inputId: 'global',
          id: QUERY_ID,
          inspect: {
            dsl: result.inspect?.dsl ?? [],
            response: [JSON.stringify(result.rawResponse, null, 2)],
          },
          loading,
          refetch: noop,
        })
      );
    }
    return deleteQuery;
  }, [deleteQuery, dispatch, loading, result, setIsModuleEnabled]);

  useEffect(() => {
    if (error) {
      if (isIndexNotFoundError(error)) {
        setIsModuleEnabled(false);
      } else {
        addError(error, {
          title: i18n.translate('xpack.securitySolution.timelines.hostRiskScore', {
            defaultMessage: 'Error Fetching Host Risk Score',
          }),
        });
        setIsModuleEnabled(true);
      }
    }
  }, [addError, error, setIsModuleEnabled]);

  useEffect(() => {
    if (hostName) {
      start({
        data,
        hostName,
        defaultIndex: [RISKY_HOSTS_INDEX],
      });
    }
  }, [start, data, hostName]);

  const source = result?.rawResponse?.hits?.hits?.[0]?._source;
  return {
    fields: source
      ? [
          { field: 'host.risk.keyword', value: source.risk },
          { field: 'host.risk_score', value: source.risk_score },
        ]
      : [],
    isModuleEnabled,
    loading,
  };
};
