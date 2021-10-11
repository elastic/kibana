/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../common/lib/kibana';
import { inputsActions } from '../../../common/store/actions';

import { HOST_RISK_SCORES_INDEX } from '../../../../common/constants';
import { isIndexNotFoundError } from '../../../common/utils/exceptions';
import { HostsRiskScore } from '../../../../common';
import { useHostsRiskScoreComplete } from './use_hosts_risk_score_complete';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

export const QUERY_ID = 'host_risk_score';
const noop = () => {};

const isRecord = (item: unknown): item is Record<string, unknown> =>
  typeof item === 'object' && !!item;

const isHostsRiskScoreHit = (item: unknown): item is HostsRiskScore =>
  isRecord(item) &&
  isRecord(item.host) &&
  typeof item.host.name === 'string' &&
  typeof item.risk_score === 'number' &&
  typeof item.risk === 'string';

export interface HostRisk {
  loading: boolean;
  isModuleEnabled?: boolean;
  result?: HostsRiskScore[];
}

export const useHostsRiskScore = ({
  timerange,
  hostName,
}: {
  timerange?: { to: string; from: string };
  hostName?: string;
}): HostRisk | null => {
  const riskyHostsFeatureEnabled = useIsExperimentalFeatureEnabled('riskyHostsEnabled');
  const [isModuleEnabled, setIsModuleEnabled] = useState<boolean | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(riskyHostsFeatureEnabled);

  const { addError } = useAppToasts();
  const { data } = useKibana().services;

  const dispatch = useDispatch();

  const { error, result, start, loading: isHostsRiskScoreLoading } = useHostsRiskScoreComplete();

  const deleteQuery = useCallback(() => {
    dispatch(inputsActions.deleteOneQuery({ inputId: 'global', id: QUERY_ID }));
  }, [dispatch]);

  useEffect(() => {
    if (!isHostsRiskScoreLoading && result) {
      setIsModuleEnabled(true);
      setLoading(false);
      dispatch(
        inputsActions.setQuery({
          inputId: 'global',
          id: QUERY_ID,
          inspect: {
            dsl: result.inspect?.dsl ?? [],
            response: [JSON.stringify(result.rawResponse, null, 2)],
          },
          loading: isHostsRiskScoreLoading,
          refetch: noop,
        })
      );
    }
    return deleteQuery;
  }, [deleteQuery, dispatch, isHostsRiskScoreLoading, result, setIsModuleEnabled]);

  useEffect(() => {
    if (error) {
      if (isIndexNotFoundError(error)) {
        setIsModuleEnabled(false);
        setLoading(false);
      } else {
        addError(error, {
          title: i18n.translate('xpack.securitySolution.overview.hostsRiskError', {
            defaultMessage: 'Error Fetching Hosts Risk',
          }),
        });
        setLoading(false);
        setIsModuleEnabled(true);
      }
    }
  }, [addError, error, setIsModuleEnabled]);

  useEffect(() => {
    if (riskyHostsFeatureEnabled && (hostName || timerange)) {
      start({
        data,
        timerange: timerange ? { to: timerange.to, from: timerange.from, interval: '' } : undefined,
        hostName,
        defaultIndex: [HOST_RISK_SCORES_INDEX],
      });
    }
  }, [start, data, timerange, hostName, riskyHostsFeatureEnabled]);

  if ((!hostName && !timerange) || !riskyHostsFeatureEnabled) {
    return null;
  }

  const hits = result?.rawResponse?.hits?.hits;

  return {
    result: isHostsRiskScoreHit(hits?.[0]?._source)
      ? (hits?.map((hit) => hit._source) as HostsRiskScore[])
      : [],
    isModuleEnabled,
    loading,
  };
};
